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

export type SpawnFn = (command: string, args: string[]) => SpawnedProcess;

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

export const defaultSpawn: SpawnFn = (command, args) => {
	const child = Bun.spawn([command, ...args], {
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

const CODEX_TOOL_ITEM_TYPES = new Set([
	"command_execution",
	"file_change",
	"function_call",
	"mcp_tool_call",
	"tool_call",
]);

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
	const isInitEvent = [
		"init",
		"session_init",
		"session.started",
		"thread.started",
	].includes(type);
	const sessionId = firstString(raw.session_id, raw.thread_id);
	if (!isInitEvent && sessionId === undefined) return [];

	const fallbackId = isInitEvent ? firstString(raw.id) : undefined;
	const resolvedId = sessionId ?? fallbackId;
	return resolvedId ? [{ sessionId: resolvedId, type: "session_id" }] : [];
}

function extractItem(raw: RawRecord): RawRecord | undefined {
	return asRecord(raw.item);
}

function extractText(raw: RawRecord): string {
	const item = extractItem(raw);
	const delta = asRecord(raw.delta) ?? asRecord(item?.delta);
	return (
		firstString(
			raw.content,
			raw.text,
			typeof raw.delta === "string" ? raw.delta : undefined,
			delta?.text,
			delta?.content,
			item?.text,
			item?.content,
		) ?? ""
	);
}

function isAssistantTextEvent(raw: RawRecord, type: string): boolean {
	const item = extractItem(raw);
	const delta = asRecord(raw.delta) ?? asRecord(item?.delta);
	const deltaType = firstString(delta?.type, raw.delta_type);
	const itemType = firstString(item?.type);

	if (type === "message") return raw.role === "assistant";
	if (type === "item.completed") return itemType === "agent_message";
	if (type === "item.delta" || type === "item_delta") return true;
	if (type === "response.output_text.delta" || type === "text") return true;
	if (raw.role === "assistant") return true;
	return deltaType === "text_delta";
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
	const itemType = firstString(item?.type);
	const toolName = firstString(
		raw.tool_name,
		raw.name,
		item?.tool_name,
		item?.name,
		itemType && CODEX_TOOL_ITEM_TYPES.has(itemType) ? itemType : undefined,
	);
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
	if (type === "tool_use" || type === "tool_call") return true;
	if (!type.startsWith("item.")) return false;
	const item = extractItem(raw);
	return CODEX_TOOL_ITEM_TYPES.has(firstString(item?.type) ?? "");
}

function tokenCount(stats: RawRecord, names: readonly string[]): number {
	for (const name of names) {
		const value = stats[name];
		if (typeof value === "number") return value;
	}
	return 0;
}

function parseUsage(raw: RawRecord): StreamEvent[] {
	const stats = asRecord(raw.usage) ?? asRecord(raw.stats);
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
	const completionTypes = [
		"result",
		"turn.completed",
		"turn_complete",
		"turn.failed",
		"turn.aborted",
	];
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

	return type === "error" ? [{ status: "error", type: "result" }] : [];
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
	isStderr: boolean,
): Promise<void> {
	const decoder = new TextDecoder();
	const reader = stream.getReader();
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;

		const text = decoder.decode(value, { stream: true });
		if (!text) continue;
		mirrorChunk(text, isStderr);
		onChunk(text);
	}

	const remaining = decoder.decode();
	if (!remaining) return;
	mirrorChunk(remaining, isStderr);
	onChunk(remaining);
}

function mirrorChunk(text: string, isStderr: boolean): void {
	const output = isStderr ? process.stderr : process.stdout;
	output.write(text);
}

export interface ProcessResult {
	events: StreamEvent[];
	exitCode: number;
	raw: string;
	stderr: string;
}

export const DEFAULT_PROCESS_TIMEOUT_MS = 600_000;

/**
 * Construct the Codex invocation for a model/provider pair.
 *
 * Codex uses `model_provider` as a config setting. Its `-p` flag instead
 * names a config profile, so provider names must never be passed to `-p`.
 */
export function buildCodexArgs(
	modelConfig: ModelConfig,
	resumeSessionId?: string,
): string[] {
	const resume = resumeSessionId ? ["resume"] : [];
	const session = resumeSessionId ? [resumeSessionId] : [];
	return [
		"exec",
		...resume,
		"--json",
		"-m",
		modelConfig.model,
		"-c",
		`model_provider="${modelConfig.provider}"`,
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

function timeoutError(modelConfig: ModelConfig, timeoutMs: number): Error {
	return new Error(
		`codex execution timed out after ${timeoutMs / 1000}s (model: ${modelConfig.model}, provider: ${modelConfig.provider})`,
	);
}

/** Spawn Codex, mirror both output streams, and enforce one hard deadline. */
export async function runProcess(
	spawn: SpawnFn,
	modelConfig: ModelConfig,
	prompt: string,
	resumeSessionId?: string,
	timeoutMs = DEFAULT_PROCESS_TIMEOUT_MS,
): Promise<ProcessResult> {
	const child = spawn(CODEX_CLI, buildCodexArgs(modelConfig, resumeSessionId));
	child.stdin.write(prompt);
	child.stdin.end();

	const events: StreamEvent[] = [];
	let raw = "";
	let stderr = "";
	const lines = createLineBuffer((line) => {
		events.push(...parseStreamLine(line));
	});

	const outputPromise = Promise.all([
		drainStream(
			child.stdout,
			(text) => {
				raw += text;
				lines.push(text);
			},
			false,
		),
		drainStream(
			child.stderr,
			(text) => {
				raw += text;
				stderr += text;
			},
			true,
		),
	]);
	const complete = Promise.all([outputPromise, child.exited]).then(
		([, exitCode]) => {
			lines.flush();
			return { events, exitCode, raw, stderr };
		},
	);
	let timer!: ReturnType<typeof setTimeout>;
	const timeout = new Promise<never>((_, reject) => {
		timer = setTimeout(() => {
			stopChild(child);
			reject(timeoutError(modelConfig, timeoutMs));
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

export function skillActivated(events: StreamEvent[], skill: string): boolean {
	return events.some(
		(event) => event.type === "activate_skill" && event.skill === skill,
	);
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
