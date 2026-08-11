import { CODEX_CLI, type ModelConfig } from "./models";

/**
 * Everything between the Codex subprocess and a normalised list of events:
 * process spawning, JSONL framing, live output mirroring, timeout protection,
 * and the projections consumed by the agent runner.
 */

export interface SpawnedProcess {
	stdin: { end(): void; write(chunk: string): void };
	stdout: ReadableStream<Uint8Array>;
	stderr: ReadableStream<Uint8Array>;
	exited: Promise<number>;
	kill?: () => void;
}

export interface SpawnOptions {
	env: Record<string, string | undefined>;
}

export type SpawnFn = (
	command: string,
	args: string[],
	options?: SpawnOptions,
) => SpawnedProcess;

export type StreamEvent =
	| { type: "session_id"; sessionId: string }
	| { type: "text"; text: string }
	| { type: "tool_call"; name: string }
	| { type: "activate_skill"; skill: string }
	| { type: "result"; status: "success" | "error" }
	| { type: "usage"; inputTokens: number; outputTokens: number };

export interface TokenUsage {
	inputTokens: number;
	outputTokens: number;
}

export const defaultSpawn: SpawnFn = (command, args, options) => {
	const child = Bun.spawn([command, ...args], {
		env: options?.env,
		stderr: "pipe",
		stdin: "pipe",
		stdout: "pipe",
	});
	return {
		exited: child.exited,
		kill: () => child.kill(),
		stderr: child.stderr,
		stdin: child.stdin,
		stdout: child.stdout,
	};
};

type RawRecord = Record<string, unknown>;

function isRecord(value: unknown): value is RawRecord {
	return typeof value === "object" && value !== null;
}

function asRecord(value: unknown): RawRecord | undefined {
	return isRecord(value) ? value : undefined;
}

function firstString(...values: unknown[]): string | undefined {
	return values.find((value): value is string => typeof value === "string");
}

function parseObject(value: unknown): RawRecord | undefined {
	if (isRecord(value)) return value;
	if (typeof value !== "string") return undefined;

	try {
		const parsed: unknown = JSON.parse(value);
		return asRecord(parsed);
	} catch {
		return undefined;
	}
}

function parseSessionInit(raw: RawRecord, type: string): StreamEvent[] {
	if (type !== "thread.started" || typeof raw.thread_id !== "string") return [];
	return [{ sessionId: raw.thread_id, type: "session_id" }];
}

function extractItem(raw: RawRecord): RawRecord | undefined {
	return asRecord(raw.item);
}

function extractText(raw: RawRecord): string {
	const item = extractItem(raw);
	return typeof item?.text === "string" ? item.text : "";
}

function isAssistantTextEvent(raw: RawRecord, type: string): boolean {
	const item = extractItem(raw);
	return type === "item.completed" && item?.type === "agent_message";
}

function parseTextDelta(raw: RawRecord, type: string): StreamEvent[] {
	if (!isAssistantTextEvent(raw, type)) return [];
	const text = extractText(raw);
	return text ? [{ text, type: "text" }] : [];
}

function extractToolArguments(raw: RawRecord, item?: RawRecord): RawRecord {
	const argumentsValue =
		raw.parameters ??
		raw.args ??
		raw.arguments ??
		item?.parameters ??
		item?.args ??
		item?.arguments;
	return parseObject(argumentsValue) ?? {};
}

function parseToolUse(raw: RawRecord): StreamEvent[] {
	const item = extractItem(raw);
	const toolName =
		item?.type === "function_call" && typeof item.name === "string"
			? item.name
			: undefined;
	if (toolName === undefined) return [];

	const parameters = extractToolArguments(raw, item);
	if (toolName === "activate_skill") {
		const skill = firstString(
			parameters.name,
			parameters.skill,
			raw.skill,
			item?.skill,
		);
		return skill ? [{ skill, type: "activate_skill" }] : [];
	}

	return [{ name: toolName, type: "tool_call" }];
}

function isToolEvent(raw: RawRecord, type: string): boolean {
	if (type !== "item.started") return false;
	const item = extractItem(raw);
	return item?.type === "function_call";
}

function tokenCount(stats: RawRecord, names: readonly string[]): number {
	for (const name of names) {
		const value = stats[name];
		if (typeof value === "number") return value;
	}
	return 0;
}

function parseUsage(raw: RawRecord): StreamEvent[] {
	const stats = asRecord(raw.usage);
	if (!stats) return [];
	return [
		{
			inputTokens: tokenCount(stats, ["input_tokens", "inputTokens"]),
			outputTokens: tokenCount(stats, ["output_tokens", "outputTokens"]),
			type: "usage",
		},
	];
}

function parseTurnResult(raw: RawRecord, type: string): StreamEvent[] {
	const completionTypes = ["turn.completed", "turn.failed", "turn.aborted"];
	if (completionTypes.includes(type)) {
		const failedTurn =
			type === "turn.failed" ||
			type === "turn.aborted" ||
			raw.status === "error" ||
			Boolean(raw.error);
		const events: StreamEvent[] = [
			{ status: failedTurn ? "error" : "success", type: "result" },
		];
		events.push(...parseUsage(raw));
		return events;
	}

	return [];
}

/** Parse one JSONL record into the runner's provider-neutral event union. */
export function parseStreamLine(line: string): StreamEvent[] {
	const trimmed = line.trim();
	if (!trimmed) return [];

	let raw: unknown;
	try {
		raw = JSON.parse(trimmed);
	} catch {
		return [];
	}
	if (!isRecord(raw)) return [];

	const type = typeof raw.type === "string" ? raw.type : "";
	const session = parseSessionInit(raw, type);
	if (session.length > 0) return session;
	if (isToolEvent(raw, type)) return parseToolUse(raw);

	const text = parseTextDelta(raw, type);
	if (text.length > 0) return text;
	return parseTurnResult(raw, type);
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
			const lastNewline = buffer.lastIndexOf("\n");
			if (lastNewline === -1) return;
			for (const line of buffer.slice(0, lastNewline).split("\n")) {
				onLine(line);
			}
			buffer = buffer.slice(lastNewline + 1);
		},
	};
}

async function drainStream(
	stream: ReadableStream<Uint8Array>,
	onChunk: (text: string) => void,
): Promise<void> {
	const decoder = new TextDecoder();
	const reader = stream.getReader();
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;

		const text = decoder.decode(value, { stream: true });
		if (!text) continue;
		onChunk(text);
	}

	const remaining = decoder.decode();
	if (!remaining) return;
	onChunk(remaining);
}

function mirrorAssistantText(events: StreamEvent[]): void {
	for (const event of events) {
		if (event.type === "text") process.stdout.write(event.text);
	}
}

export interface ProcessResult {
	events: StreamEvent[];
	exitCode: number;
	raw: string;
	stderr: string;
	timedOut: boolean;
	timeoutMs: number;
}

export const DEFAULT_PROCESS_TIMEOUT_MS = 600_000;
/** CI-only opt-in for externally sandboxed GitHub-hosted runners. */
export const CODEX_BYPASS_SANDBOX_ENV = "AGENT_CODEX_BYPASS_SANDBOX";

/**
 * Construct the Codex invocation for a supported OpenAI model.
 *
 * Authentication is established by `codex login --with-api-key` in CI rather
 * than by passing provider configuration to each process invocation.
 */
export function buildCodexArgs(
	modelConfig: ModelConfig,
	resumeSessionId?: string,
	bypassSandbox = false,
): string[] {
	const resume = resumeSessionId ? ["resume"] : [];
	const session = resumeSessionId ? [resumeSessionId] : [];
	return [
		"exec",
		...resume,
		"--json",
		"-m",
		modelConfig.model,
		...(bypassSandbox ? ["--dangerously-bypass-approvals-and-sandbox"] : []),
		...session,
		"-",
	];
}

function stopChild(child: SpawnedProcess): void {
	try {
		child.kill?.();
	} catch {
		// The process may have exited between the timeout and kill signal.
	}
}

/** Spawn Codex, mirror both output streams, and enforce one hard deadline. */
export async function runProcess(
	spawn: SpawnFn,
	modelConfig: ModelConfig,
	prompt: string,
	resumeSessionId?: string,
	timeoutMs = DEFAULT_PROCESS_TIMEOUT_MS,
	environment?: Record<string, string | undefined>,
): Promise<ProcessResult> {
	const args = buildCodexArgs(
		modelConfig,
		resumeSessionId,
		environment?.[CODEX_BYPASS_SANDBOX_ENV] === "1",
	);
	const child = environment
		? spawn(CODEX_CLI, args, { env: environment })
		: spawn(CODEX_CLI, args);
	child.stdin.write(prompt);
	child.stdin.end();

	const events: StreamEvent[] = [];
	let raw = "";
	let stderr = "";
	const lines = createLineBuffer((line) => {
		const parsed = parseStreamLine(line);
		events.push(...parsed);
		mirrorAssistantText(parsed);
	});

	const outputPromise = Promise.all([
		drainStream(child.stdout, (text) => {
			raw += text;
			lines.push(text);
		}),
		drainStream(child.stderr, (text) => {
			raw += text;
			stderr += text;
		}),
	]);
	const complete = Promise.all([outputPromise, child.exited]).then(
		([, exitCode]) => {
			lines.flush();
			return { events, exitCode, raw, stderr, timedOut: false, timeoutMs: 0 };
		},
	);
	let timer!: ReturnType<typeof setTimeout>;
	const timeout = new Promise<ProcessResult>((resolve) => {
		timer = setTimeout(() => {
			stopChild(child);
			lines.flush();
			resolve({
				events,
				exitCode: -1,
				raw,
				stderr,
				timedOut: true,
				timeoutMs,
			});
		}, timeoutMs);
	});

	try {
		return await Promise.race([complete, timeout]);
	} finally {
		clearTimeout(timer);
	}
}

export function collectText(events: StreamEvent[]): string {
	return events
		.filter(
			(event): event is Extract<StreamEvent, { type: "text" }> =>
				event.type === "text",
		)
		.map((event) => event.text)
		.join("");
}

export function findSessionId(events: StreamEvent[]): string | undefined {
	const sessionEvent = events.find(
		(event): event is Extract<StreamEvent, { type: "session_id" }> =>
			event.type === "session_id",
	);
	return sessionEvent?.sessionId;
}

export function sumUsage(events: StreamEvent[]): TokenUsage {
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
