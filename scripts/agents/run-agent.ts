import { z } from "zod";
import {
	appendUsage,
	resolveArtifactsDir,
	writeFailureReason,
} from "./artifacts";
import { classifyExit, type FailureClass, RunAgentError } from "./failure";
import { logger } from "./logger";
import {
	CODEX_CLI,
	createProviderEnvironment,
	getModelConfig,
	type ModelConfig,
	missingApiKeyMessage,
	resolveApiKey,
	validateModelConfig,
} from "./models";
import {
	DEFAULT_COMPLETION_SIGNAL,
	type ObjectOutput,
	type ProseOutput,
	truncateAtSignal,
	type ValidationResult,
	validateTaggedJson,
} from "./output";
import { type AgentSkill, buildPrompt } from "./prompt";
import {
	collectText,
	defaultSpawn,
	findSessionId,
	type ProcessResult,
	runProcess,
	type SpawnFn,
	type StreamEvent,
	sumUsage,
	type TokenUsage,
} from "./stream";

export const DEFAULT_MAX_RETRIES = 2;
export const DEFAULT_RUN_TIMEOUT_MS = 12 * 60_000;

function resolveRunTimeout(environment = process.env): number {
	const configured = environment.AGENT_RUN_TIMEOUT_MS;
	if (!configured?.trim()) return DEFAULT_RUN_TIMEOUT_MS;

	const timeoutMs = Number(configured);
	if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
		throw new Error(
			`AGENT_RUN_TIMEOUT_MS must be a positive number of milliseconds, received "${configured}".`,
		);
	}
	return timeoutMs;
}

interface BaseRunOptions {
	/** Optional override; omitted runs use the active environment configuration. */
	model?: ModelConfig;
	/** Path to the prompt template on disk; `{{KEY}}` placeholders come from `promptArgs`. */
	promptFile: string;
	promptArgs: Record<string, string>;
	/** Defaults to `<promise>COMPLETE</promise>`. */
	completionSignal?: string;
	/** Trusted vendored skills injected by the workflow before the stage contract. */
	skills?: readonly AgentSkill[];
	/** Validation-failure retries, by resuming the same session. Defaults to 2. */
	maxRetries?: number;
	/** Total time available to all attempts, including retries. */
	timeoutMs?: number;
	/** Injected for tests; defaults to Bun.spawn. */
	spawn?: SpawnFn;
}

export interface ObjectRunOptions<T> extends BaseRunOptions {
	output: ObjectOutput<T>;
}

export interface ProseRunOptions extends BaseRunOptions {
	output: ProseOutput;
}

export interface RunAgentResult<T> {
	/** Typed, validated — never a raw string for a stage script to branch on. */
	output: T;
	/** Full transcript, for logging only. */
	raw: string;
	sessionId?: string;
	/** Set when the completion signal was seen in the transcript. */
	completionSignal?: string;
	usage: TokenUsage & { requests: number };
}

/**
 * What the retry loop needs, and nothing else. Resolving `options` into this
 * shape up front is what keeps the loop free of output kinds, tags, schemas and
 * defaults: by the time `execute` runs, "what counts as valid output" is just a
 * function.
 */
interface RunRequest<T> {
	environment: Record<string, string | undefined>;
	model: ModelConfig;
	prompt: string;
	completionSignal: string;
	maxRetries: number;
	timeoutMs: number;
	validate: (text: string) => ValidationResult<T>;
	spawn: SpawnFn;
}

/** Everything accumulated across one or more attempts of the same run. */
interface Transcript {
	events: StreamEvent[];
	raw: string;
	requests: number;
	sessionId?: string;
}

/**
 * The result of a whole run, decided before anything is written or thrown.
 * `failure: null` is the seventh, outside-the-table case (§5.1): a genuine CLI
 * or API failure with no `FailureClass` to report, which fails loudly as a
 * plain `Error` rather than being misfiled under the nearest class.
 */
type Outcome<T> =
	| { ok: true; value: T; signalSeen: boolean }
	| { ok: false; failure: FailureClass | null; message: string };

const EMPTY_TRANSCRIPT: Transcript = {
	events: [],
	raw: "",
	requests: 0,
	sessionId: undefined,
};

function failed(failure: FailureClass | null, message: string): Outcome<never> {
	return { failure, message, ok: false };
}

function record(transcript: Transcript, attempt: ProcessResult): Transcript {
	return {
		events: [...transcript.events, ...attempt.events],
		raw: transcript.raw + attempt.raw,
		requests: transcript.requests + 1,
		sessionId: findSessionId(attempt.events) ?? transcript.sessionId,
	};
}

interface Attempts<T> {
	outcome: Outcome<T>;
	transcript: Transcript;
}

/** Either the run is over — however it ended — or there is a retry worth spending. */
type Verdict<T> =
	| { kind: "done"; outcome: Outcome<T> }
	| { kind: "retry"; prompt: string };

function done<T>(outcome: Outcome<T>): Verdict<T> {
	return { kind: "done", outcome };
}

/**
 * Reads one finished attempt. Every reason a run can stop is decided here, in
 * one place and in one direction, so the loop below is left with nothing but
 * spawning and accumulation.
 */
function judgeAttempt<T>(
	request: RunRequest<T>,
	transcript: Transcript,
	result: ProcessResult,
	attempt: number,
): Verdict<T> {
	const cli = CODEX_CLI;
	if (result.timedOut) {
		return done(
			failed(
				"timeout",
				`${cli} execution timed out after ${result.timeoutMs / 1000}s (model: ${request.model.model}, provider: ${request.model.provider})`,
			),
		);
	}

	if (result.exitCode !== 0) {
		const classified = classifyExit(result.exitCode, result.stderr);
		return done(
			failed(
				classified === "unclassified" ? null : classified,
				`${cli} exited with code ${result.exitCode}: ${result.raw}`,
			),
		);
	}

	const { signalSeen, text } = truncateAtSignal(
		collectText(result.events),
		request.completionSignal,
	);
	const validation = request.validate(text);

	if (validation.success) {
		return done({ ok: true, signalSeen, value: validation.value });
	}

	if (attempt >= request.maxRetries) {
		return done(failed("bad-output", validation.error));
	}

	// A retry carries only the validation error as its prompt, so it is
	// worthless without the session that holds the original task. No session id
	// means there is nothing to resume — fail on the output we have rather than
	// spend a request asking a fresh session to fix an error it never saw.
	if (transcript.sessionId === undefined) {
		return done(
			failed(
				"bad-output",
				`${validation.error}\n\nCannot retry: ${cli} reported no session id to resume.`,
			),
		);
	}

	return { kind: "retry", prompt: validation.error };
}

/**
 * Runs the CLI until `judgeAttempt` says to stop. Decides *what happened* and
 * nothing more: no files, no throwing — that all belongs to the single tail in
 * `execute`.
 */
async function runAttempts<T>(request: RunRequest<T>): Promise<Attempts<T>> {
	let transcript = EMPTY_TRANSCRIPT;
	let prompt = request.prompt;
	const deadline = Date.now() + request.timeoutMs;

	for (let attempt = 0; ; attempt++) {
		const attemptsRemaining = request.maxRetries - attempt + 1;
		const remainingMs = deadline - Date.now();
		const resumeSessionId = attempt === 0 ? undefined : transcript.sessionId;
		const result = await runProcess(
			request.spawn,
			request.model,
			prompt,
			resumeSessionId,
			Math.max(1, Math.ceil(remainingMs / attemptsRemaining)),
			request.environment,
		);
		transcript = record(transcript, result);

		const verdict = judgeAttempt(request, transcript, result, attempt);
		if (verdict.kind === "done") {
			return { outcome: verdict.outcome, transcript };
		}

		prompt = verdict.prompt;
	}
}

/** The one place either artifact is written — every run path, success or failure, passes through here. */
function writeArtifacts<T>(
	request: RunRequest<T>,
	transcript: Transcript,
	outcome: Outcome<T>,
	usage: TokenUsage,
): void {
	const dir = resolveArtifactsDir();
	if (dir === null) {
		logger.warn(
			"OUTPUT_DIR is unset — skipping usage.jsonl and failure_reason.txt for this run.",
		);
		return;
	}

	if (!outcome.ok && outcome.failure !== null) {
		writeFailureReason(dir, outcome.failure, outcome.message);
	}

	appendUsage(dir, {
		...usage,
		cli: CODEX_CLI,
		model: request.model.model,
		requests: transcript.requests,
	});
}

async function execute<T>(request: RunRequest<T>): Promise<RunAgentResult<T>> {
	const { outcome, transcript } = await runAttempts(request);
	const usage = sumUsage(transcript.events);

	writeArtifacts(request, transcript, outcome, usage);

	if (!outcome.ok) {
		throw outcome.failure === null
			? new Error(outcome.message)
			: new RunAgentError(outcome.failure, outcome.message);
	}

	return {
		completionSignal: outcome.signalSeen ? request.completionSignal : undefined,
		output: outcome.value,
		raw: transcript.raw,
		sessionId: transcript.sessionId,
		usage: { ...usage, requests: transcript.requests },
	};
}

function requestFor<T>(
	options: BaseRunOptions,
	prompt: string,
	validate: (text: string) => ValidationResult<T>,
): RunRequest<T> {
	const model = validateModelConfig(options.model ?? getModelConfig());
	const apiKey = resolveApiKey(model.provider);
	if (!apiKey) {
		throw new Error(missingApiKeyMessage(model.provider));
	}
	return {
		completionSignal: options.completionSignal ?? DEFAULT_COMPLETION_SIGNAL,
		environment: createProviderEnvironment(model.provider, apiKey),
		maxRetries: options.maxRetries ?? DEFAULT_MAX_RETRIES,
		model,
		prompt,
		spawn: options.spawn ?? defaultSpawn,
		timeoutMs: options.timeoutMs ?? resolveRunTimeout(),
		validate,
	};
}

/**
 * The single seam every model invocation passes through (spec §5.3): spawns the
 * agent CLI, writes the prompt on stdin, and returns a typed, validated result.
 *
 * The two overloads are the whole reason there is no cast anywhere below: prose
 * output *is* `string`, object output is whatever its schema parses to, and each
 * caller gets the one it asked for straight from the signature.
 */
export function runAgent(
	options: ProseRunOptions,
): Promise<RunAgentResult<string>>;
export function runAgent<T>(
	options: ObjectRunOptions<T>,
): Promise<RunAgentResult<T>>;
export async function runAgent<T>(
	options: ProseRunOptions | ObjectRunOptions<T>,
): Promise<RunAgentResult<T | string>> {
	const output = options.output;

	if (output.kind === "prose") {
		return execute(
			requestFor(
				options,
				buildPrompt(
					options.promptFile,
					options.promptArgs,
					undefined,
					options.skills,
				),
				(text) => ({ success: true, value: text }),
			),
		);
	}

	const schema = JSON.stringify(z.toJSONSchema(output.schema));
	return execute(
		requestFor(
			options,
			buildPrompt(
				options.promptFile,
				options.promptArgs,
				schema,
				options.skills,
			),
			(text) => validateTaggedJson(text, output),
		),
	);
}
