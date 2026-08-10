/**
 * Everything between the CLI subprocess and a normalised list of events: the
 * `spawn` seam, JSONL line framing, and the projections a caller needs off a
 * finished stream. Nothing here knows about prompts, output schemas, retries or
 * failure classes.
 */

/**
 * The seam every model invocation passes through (spec §5.3). Tests inject
 * `spawn` to replay recorded JSONL fixtures — no network, no subprocess.
 * Narrowed to exactly what `runProcess` uses so a fake process can satisfy it
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

/**
 * Reassembles newline-delimited records from arbitrary chunk boundaries. Splits
 * on the last newline in the buffer rather than popping a trailing fragment off
 * `String.split`, so the remainder is a plain substring and no branch or cast
 * is needed to prove one exists.
 */
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
			for (const line of buffer.slice(0, lastNewline).split("\n")) onLine(line);
			buffer = buffer.slice(lastNewline + 1);
		},
	};
}

/**
 * Drains a stream chunk-by-chunk, decoding as it goes. `stdout` and `stderr`
 * are drained concurrently (see `runProcess`) rather than one after the other,
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

export interface ProcessResult {
	events: StreamEvent[];
	exitCode: number;
	/** stdout and stderr interleaved — the transcript, for diagnostics only. */
	raw: string;
	/** stderr alone: the only text failure classification is allowed to read. */
	stderr: string;
}

/**
 * Spawns the CLI, writes the prompt on stdin (avoids the ~128 KB argv limit),
 * and returns the parsed stream once the process has exited.
 */
export async function runProcess(
	spawn: SpawnFn,
	command: string,
	args: string[],
	prompt: string,
): Promise<ProcessResult> {
	const child = spawn(command, args);
	child.stdin.write(prompt);
	child.stdin.end();

	const events: StreamEvent[] = [];
	let raw = "";
	let stderr = "";
	const lines = createLineBuffer((line) => {
		events.push(...parseStreamLine(line));
	});

	await Promise.all([
		drainStream(child.stdout, (text) => {
			raw += text;
			lines.push(text);
		}),
		drainStream(child.stderr, (text) => {
			raw += text;
			stderr += text;
		}),
	]);

	const exitCode = await child.exited;
	lines.flush();

	return { events, exitCode, raw, stderr };
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
