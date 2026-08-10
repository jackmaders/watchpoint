import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { logger } from "./logger";

/**
 * The seam every model invocation passes through (spec §5.3). Tests inject
 * `spawn` to replay recorded JSONL fixtures — no network, no subprocess.
 * Narrowed to exactly what runAgent uses so a fake process can satisfy it
 * without impersonating the full `Bun.Subprocess` API.
 */
export interface SpawnedProcess {
	stdin: { end(): void; write(chunk: string): void };
	stdout: ReadableStream<Uint8Array>;
	stderr: ReadableStream<Uint8Array>;
	exited: Promise<number>;
}

export type SpawnFn = (command: string, args: string[]) => SpawnedProcess;

/**
 * The normalised event union every CLI's JSONL stream is parsed into
 * (spec §5.3, step 4). `tool_result` and `error` are folded into this union
 * rather than added as members of their own — `tool_result` carries nothing
 * a stage script needs yet, and `error` is just a `result` with a failed
 * status.
 */
export type StreamEvent =
	| { type: "session_id"; sessionId: string }
	| { type: "text"; text: string }
	| { type: "tool_call"; name: string }
	| { type: "activate_skill"; skill: string }
	| { type: "result"; status: "success" | "error" }
	| { type: "usage"; inputTokens: number; outputTokens: number };

/**
 * §5.3's rule made a type: no stage script may act on a raw string. `prose`
 * is the deliberately conspicuous escape hatch for stages whose entire
 * product is text posted verbatim — a code reviewer skimming a call site for
 * `kind: "prose"` next to a GitHub mutation is looking at a bug (spec §5.4).
 */
export type OutputSpec<T> =
	| { kind: "object"; tag: string; schema: z.ZodType<T>; maxRetries?: number }
	| { kind: "prose" };

export interface RunAgentOptions<T> {
	cli: "gemini" | "claude";
	model: string;
	/** Path to the prompt template on disk; `{{KEY}}` placeholders come from `promptArgs`. */
	promptFile: string;
	promptArgs: Record<string, string>;
	/** Defaults to `<promise>COMPLETE</promise>`. */
	completionSignal?: string;
	/** Assert this skill activated during the run — treat a miss as a prompt bug, not a flake. */
	expectSkill?: string;
	output: OutputSpec<T>;
	/** Injected for tests; defaults to Bun.spawn. */
	spawn?: SpawnFn;
}

export interface RunAgentResult<T> {
	/** Typed, validated — never a raw string for a stage script to branch on. */
	output: T;
	/** Full transcript, for logging only. */
	raw: string;
	sessionId?: string;
	/** Set when the completion signal was seen in the transcript. */
	completionSignal?: string;
	usage: { requests: number; inputTokens: number; outputTokens: number };
}

export const DEFAULT_COMPLETION_SIGNAL = "<promise>COMPLETE</promise>";
export const DEFAULT_MAX_RETRIES = 2;

/**
 * The six outcomes of a run (spec §5.3's table). Classification happens at
 * exactly two points in `runAgent`: once for a non-zero exit code (`quota`,
 * `turn-limit`, `bad-input` are all exit-code-shaped), and once for the
 * exit-0 aftermath (`bad-output`, `skill-miss`, `ok`). An exit code of `1`
 * without rate-limit/quota text is a genuine, unclassified CLI or API
 * failure — outside these six classes by the spec's own design — so
 * `runAgent` fails loudly for it rather than routing it through this
 * function (see the guard in the exit-code branch below).
 */
export type FailureClass =
	| "ok"
	| "quota"
	| "turn-limit"
	| "bad-input"
	| "bad-output"
	| "skill-miss";

export interface ClassifyFailureInput {
	exitCode: number;
	raw: string;
	schemaValid: boolean;
	skillActivated: boolean;
	expectSkill?: string;
}

const QUOTA_PATTERN = /rate.?limit|quota/i;

export function classifyFailure(input: ClassifyFailureInput): FailureClass {
	if (input.exitCode === 1 && QUOTA_PATTERN.test(input.raw)) return "quota";
	if (input.exitCode === 53) return "turn-limit";
	if (input.exitCode === 42) return "bad-input";
	if (!input.schemaValid) return "bad-output";
	if (input.expectSkill && !input.skillActivated) return "skill-miss";
	return "ok";
}

export class RunAgentError extends Error {
	readonly failureClass: FailureClass;

	constructor(failureClass: FailureClass, message: string) {
		super(message);
		this.name = "RunAgentError";
		this.failureClass = failureClass;
	}
}

const PLACEHOLDER_PATTERN = /\{\{([A-Za-z0-9_]+)\}\}/g;

/**
 * `{{KEY}}` substitution from `promptArgs`. An unmatched `{{KEY}}` is an
 * error; an unused argument is a warning (spec §5.3, step 1). Uses a single
 * `String.replace` pass, so a value containing `{{OTHER}}` or backtick-shell
 * syntax is never re-scanned or expanded — argument values are inert, which
 * is what makes it safe to pass arbitrary issue text through.
 */
export function substitutePromptArgs(
	template: string,
	promptArgs: Record<string, string>,
): string {
	const unusedKeys = new Set(Object.keys(promptArgs));

	const substituted = template.replace(
		PLACEHOLDER_PATTERN,
		(_match, key: string) => {
			if (!(key in promptArgs)) {
				throw new Error(`Unmatched prompt placeholder: {{${key}}}`);
			}
			unusedKeys.delete(key);
			// The `in` check above already guarantees a value; `Record<string, string>`
			// rules out `undefined`, so there is no fallback branch to reach here.
			return promptArgs[key];
		},
	);

	for (const key of unusedKeys) {
		logger.warn(`Unused prompt argument: ${key}`);
	}

	return substituted;
}

/**
 * Extracts the payload between `<tag>…</tag>`. Non-greedy so a transcript
 * carrying more than one tagged block still yields the first, intended one.
 */
export function extractTagged(text: string, tag: string): string | null {
	const pattern = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`);
	const match = text.match(pattern);
	return match ? match[1].trim() : null;
}

export type ValidationResult<T> =
	| { success: true; value: T }
	| { success: false; error: string };

/**
 * Tagged-payload extraction, JSON parse, and schema validation (spec §5.3,
 * step 6) as one pure function — the highest seam available below `spawn`,
 * per the repo's no-seams-below-these rule. `{ kind: "prose" }` skips all of
 * it by design; the raw text is the product.
 */
export function parseAndValidate<T>(
	text: string,
	output: OutputSpec<T>,
): ValidationResult<T> {
	if (output.kind === "prose") {
		return { success: true, value: text as T };
	}

	const tagged = extractTagged(text, output.tag);
	if (tagged === null) {
		return {
			error: `No <${output.tag}> tag found in the model's output.`,
			success: false,
		};
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(tagged);
	} catch (error) {
		return {
			error: `Failed to parse JSON inside <${output.tag}>: ${
				error instanceof Error ? error.message : String(error)
			}`,
			success: false,
		};
	}

	const result = output.schema.safeParse(parsed);
	if (!result.success) {
		return { error: result.error.message, success: false };
	}

	return { success: true, value: result.data };
}

function buildArgs(model: string, resumeSessionId?: string): string[] {
	const base = [
		"--approval-mode",
		"yolo",
		"--output-format",
		"stream-json",
		"-m",
		model,
	];
	if (resumeSessionId) {
		return [...base, "--resume", resumeSessionId, "-p", "-"];
	}
	return [...base, "-p", "-"];
}

/** The first attempt starts fresh; every retry resumes the prior session (spec §5.3, step 6). */
function argsForAttempt(
	model: string,
	attempt: number,
	sessionId: string | undefined,
): string[] {
	return attempt === 0 ? buildArgs(model) : buildArgs(model, sessionId);
}

const defaultSpawn: SpawnFn = (command, args) => {
	const child = Bun.spawn([command, ...args], {
		stderr: "pipe",
		stdin: "pipe",
		stdout: "pipe",
	});
	return {
		exited: child.exited,
		stderr: child.stderr,
		stdin: child.stdin,
		stdout: child.stdout,
	};
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function parseToolUse(raw: Record<string, unknown>): StreamEvent[] {
	if (typeof raw.tool_name !== "string") return [];

	if (raw.tool_name !== "activate_skill") {
		return [{ name: raw.tool_name, type: "tool_call" }];
	}

	const parameters = isRecord(raw.parameters) ? raw.parameters : {};
	const skill = parameters.name ?? parameters.skill;
	return typeof skill === "string" ? [{ skill, type: "activate_skill" }] : [];
}

function parseResult(raw: Record<string, unknown>): StreamEvent[] {
	const events: StreamEvent[] = [
		{ status: raw.status === "success" ? "success" : "error", type: "result" },
	];

	const stats = isRecord(raw.stats) ? raw.stats : null;
	if (stats) {
		events.push({
			inputTokens:
				typeof stats.input_tokens === "number" ? stats.input_tokens : 0,
			outputTokens:
				typeof stats.output_tokens === "number" ? stats.output_tokens : 0,
			type: "usage",
		});
	}

	return events;
}

/**
 * Parses one line of a CLI's `--output-format stream-json` output into zero
 * or more normalised events. Zero-or-more because a single raw line (e.g.
 * `result`, which carries both a completion status and token stats) can
 * carry more than one fact the pipeline cares about.
 */
export function parseStreamLine(line: string): StreamEvent[] {
	const trimmed = line.trim();
	if (!trimmed) return [];

	let raw: unknown;
	try {
		raw = JSON.parse(trimmed);
	} catch {
		return [];
	}

	if (!isRecord(raw) || typeof raw.type !== "string") return [];

	switch (raw.type) {
		case "init":
			return typeof raw.session_id === "string"
				? [{ sessionId: raw.session_id, type: "session_id" }]
				: [];
		case "message":
			return raw.role === "assistant" && typeof raw.content === "string"
				? [{ text: raw.content, type: "text" }]
				: [];
		case "tool_use":
			return parseToolUse(raw);
		case "result":
			return parseResult(raw);
		case "error":
			return [{ status: "error", type: "result" }];
		default:
			return [];
	}
}

function createLineBuffer(onLine: (line: string) => void) {
	let buffer = "";
	return {
		flush() {
			if (buffer.trim()) onLine(buffer);
			buffer = "";
		},
		push(chunk: string) {
			buffer += chunk;
			const lines = buffer.split("\n");
			// `String.split` on any input (including "") always returns at
			// least one element, so `pop()` here is never `undefined`.
			buffer = lines.pop() as string;
			for (const line of lines) onLine(line);
		},
	};
}

/**
 * Drains a stream chunk-by-chunk, decoding as it goes. `stdout` and `stderr`
 * are drained concurrently (see `runOnce`) rather than one after the other,
 * so a chatty stderr can't stall stdout behind a full OS pipe buffer.
 */
async function drainStream(
	stream: ReadableStream<Uint8Array>,
	onChunk: (text: string) => void,
): Promise<void> {
	const decoder = new TextDecoder();
	const reader = stream.getReader();
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		onChunk(decoder.decode(value, { stream: true }));
	}
}

function collectText(events: StreamEvent[]): string {
	return events
		.filter(
			(event): event is Extract<StreamEvent, { type: "text" }> =>
				event.type === "text",
		)
		.map((event) => event.text)
		.join("");
}

function findSessionId(events: StreamEvent[]): string | undefined {
	const sessionEvent = events.find(
		(event): event is Extract<StreamEvent, { type: "session_id" }> =>
			event.type === "session_id",
	);
	return sessionEvent?.sessionId;
}

function sumUsage(events: StreamEvent[]): {
	inputTokens: number;
	outputTokens: number;
} {
	return events
		.filter(
			(event): event is Extract<StreamEvent, { type: "usage" }> =>
				event.type === "usage",
		)
		.reduce(
			(totals, event) => ({
				inputTokens: totals.inputTokens + event.inputTokens,
				outputTokens: totals.outputTokens + event.outputTokens,
			}),
			{ inputTokens: 0, outputTokens: 0 },
		);
}

/**
 * Stops the run's *text* at the completion signal (spec §5.3, step 5) — text
 * emitted after it is a chatty CLI trailing off, not part of the payload.
 * The signal is still reported on the result so a workflow can tell a clean
 * stop from a process that just ran out of things to say.
 */
function truncateAtSignal(
	text: string,
	signal: string,
): { text: string; signalSeen: boolean } {
	const index = text.indexOf(signal);
	if (index === -1) return { signalSeen: false, text };
	return { signalSeen: true, text: text.slice(0, index + signal.length) };
}

interface RunOnceResult {
	events: StreamEvent[];
	exitCode: number;
	raw: string;
}

async function runOnce(
	spawnFn: SpawnFn,
	cli: string,
	args: string[],
	prompt: string,
): Promise<RunOnceResult> {
	const child = spawnFn(cli, args);
	child.stdin.write(prompt);
	child.stdin.end();

	const events: StreamEvent[] = [];
	let raw = "";
	const lineBuffer = createLineBuffer((line) => {
		events.push(...parseStreamLine(line));
	});

	await Promise.all([
		drainStream(child.stdout, (text) => {
			raw += text;
			lineBuffer.push(text);
		}),
		drainStream(child.stderr, (text) => {
			raw += text;
		}),
	]);

	const exitCode = await child.exited;
	lineBuffer.flush();

	return { events, exitCode, raw };
}

function outputDir(): string | undefined {
	return process.env.OUTPUT_DIR;
}

/** Written only on failure (spec §5.3, step 7) — its absence tells a workflow the run was `ok`. */
function writeFailureReason(failureClass: FailureClass, message: string): void {
	const dir = outputDir();
	if (!dir) return;
	writeFileSync(
		join(dir, "failure_reason.txt"),
		`${failureClass}\n${message}\n`,
	);
}

/** Appended on every run, success or failure (spec §5.3, step 8). */
function appendUsage(entry: {
	cli: string;
	model: string;
	requests: number;
	inputTokens: number;
	outputTokens: number;
}): void {
	const dir = outputDir();
	if (!dir) return;
	appendFileSync(join(dir, "usage.jsonl"), `${JSON.stringify(entry)}\n`);
}

/** Everything accumulated across one or more attempts of the same run. */
interface AccumulatedState {
	allEvents: StreamEvent[];
	raw: string;
	requests: number;
	sessionId: string | undefined;
}

function recordAttempt(state: AccumulatedState, result: RunOnceResult): void {
	state.requests += 1;
	state.raw += result.raw;
	state.allEvents = [...state.allEvents, ...result.events];
	state.sessionId = findSessionId(result.events) ?? state.sessionId;
}

/** Appends usage.jsonl — the one call site every run path (success or failure) funnels through (spec §5.3, step 8). */
function flushUsage<T>(
	options: RunAgentOptions<T>,
	state: AccumulatedState,
): { inputTokens: number; outputTokens: number } {
	const usage = sumUsage(state.allEvents);
	appendUsage({
		...usage,
		cli: options.cli,
		model: options.model,
		requests: state.requests,
	});
	return usage;
}

/** Writes failure_reason.txt + usage.jsonl, then throws — the shared tail of every classified failure path. */
function reportAndThrow<T>(
	options: RunAgentOptions<T>,
	state: AccumulatedState,
	failureClass: FailureClass,
	message: string,
): never {
	writeFailureReason(failureClass, message);
	flushUsage(options, state);
	throw new RunAgentError(failureClass, message);
}

function handleExitFailure<T>(
	options: RunAgentOptions<T>,
	state: AccumulatedState,
	exitCode: number,
): never {
	if (exitCode === 1 && !QUOTA_PATTERN.test(state.raw)) {
		// Exit 1 without rate-limit/quota text is a genuine, unclassified CLI
		// or API failure (§5.1) — outside the six defined failure classes.
		// It still fails loudly (a plain Error, not a RunAgentError) and still
		// logs usage, but deliberately writes no failure_reason.txt: there is
		// no FailureClass to report, and the thrown error's own message is
		// the diagnostic a workflow would otherwise read from that file.
		flushUsage(options, state);
		throw new Error(
			`${options.cli} exited with code ${exitCode}: ${state.raw}`,
		);
	}

	const failureClass = classifyFailure({
		exitCode,
		raw: state.raw,
		schemaValid: true,
		skillActivated: true,
	});
	reportAndThrow(
		options,
		state,
		failureClass,
		`${options.cli} exited with code ${exitCode}: ${state.raw}`,
	);
}

function buildPromptArgs<T>(
	options: RunAgentOptions<T>,
): Record<string, string> {
	if (options.output.kind !== "object") return options.promptArgs;
	return {
		...options.promptArgs,
		// The contract in the prompt and the contract in the code are the
		// same object (spec §5.4) — never restated in prose.
		OUTPUT_SCHEMA: JSON.stringify(z.toJSONSchema(options.output.schema)),
	};
}

function buildInitialPrompt<T>(options: RunAgentOptions<T>): string {
	const template = readFileSync(options.promptFile, "utf-8");
	return substitutePromptArgs(template, buildPromptArgs(options));
}

function finalizeSuccess<T>(
	options: RunAgentOptions<T>,
	state: AccumulatedState,
	value: T,
	signalSeen: boolean,
	completionSignal: string,
): RunAgentResult<T> {
	const skillActivated = state.allEvents.some(
		(event) =>
			event.type === "activate_skill" && event.skill === options.expectSkill,
	);
	const failureClass = classifyFailure({
		exitCode: 0,
		expectSkill: options.expectSkill,
		raw: state.raw,
		schemaValid: true,
		skillActivated,
	});

	if (failureClass === "skill-miss") {
		reportAndThrow(
			options,
			state,
			"skill-miss",
			`Expected skill "${options.expectSkill}" to activate, but it did not.`,
		);
	}

	const usage = flushUsage(options, state);

	return {
		completionSignal: signalSeen ? completionSignal : undefined,
		output: value,
		raw: state.raw,
		sessionId: state.sessionId,
		usage: { ...usage, requests: state.requests },
	};
}

type AttemptOutcome<T> =
	| { type: "retry"; prompt: string }
	| { type: "success"; value: T; signalSeen: boolean };

/** Truncates at the completion signal, then validates — retry vs. give up lives here, not in the loop. */
function evaluateAttempt<T>(
	options: RunAgentOptions<T>,
	state: AccumulatedState,
	result: RunOnceResult,
	completionSignal: string,
	attempt: number,
	maxRetries: number,
): AttemptOutcome<T> {
	const fullText = collectText(result.events);
	const { text, signalSeen } = truncateAtSignal(fullText, completionSignal);
	const validation = parseAndValidate(text, options.output);

	if (validation.success) {
		return { signalSeen, type: "success", value: validation.value };
	}

	if (attempt >= maxRetries) {
		reportAndThrow(options, state, "bad-output", validation.error);
	}

	return { prompt: validation.error, type: "retry" };
}

/**
 * Spawns the agent CLI, writes the prompt on stdin (avoids the ~128 KB argv
 * limit), and returns a typed, validated result — the single seam every
 * model invocation passes through (spec §5.3).
 */
export async function runAgent<T>(
	options: RunAgentOptions<T>,
): Promise<RunAgentResult<T>> {
	const spawnFn = options.spawn ?? defaultSpawn;
	const completionSignal =
		options.completionSignal ?? DEFAULT_COMPLETION_SIGNAL;
	const maxRetries =
		options.output.kind === "object"
			? (options.output.maxRetries ?? DEFAULT_MAX_RETRIES)
			: 0;

	let prompt = buildInitialPrompt(options);
	const state: AccumulatedState = {
		allEvents: [],
		raw: "",
		requests: 0,
		sessionId: undefined,
	};

	for (let attempt = 0; ; attempt++) {
		const args = argsForAttempt(options.model, attempt, state.sessionId);
		const result = await runOnce(spawnFn, options.cli, args, prompt);
		recordAttempt(state, result);

		if (result.exitCode !== 0) {
			handleExitFailure(options, state, result.exitCode);
		}

		const outcome = evaluateAttempt(
			options,
			state,
			result,
			completionSignal,
			attempt,
			maxRetries,
		);

		if (outcome.type === "retry") {
			prompt = outcome.prompt;
			continue;
		}

		return finalizeSuccess(
			options,
			state,
			outcome.value,
			outcome.signalSeen,
			completionSignal,
		);
	}
}
