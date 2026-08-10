import { spawn as nodeSpawn } from "node:child_process";

/**
 * The seam every model invocation passes through (spec §5.3). Tests inject
 * `spawn` to replay recorded JSONL fixtures — no network, no subprocess.
 * Narrowed to exactly what runAgent uses so a fake process can satisfy it
 * without impersonating the full `ChildProcess` API.
 */
export interface SpawnedProcess {
	stdin: { end(): void; write(chunk: string): void };
	stdout: {
		on(event: "data", listener: (chunk: Buffer | string) => void): void;
	};
	stderr: {
		on(event: "data", listener: (chunk: Buffer | string) => void): void;
	};
	on(event: "close", listener: (code: number | null) => void): void;
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

export interface RunAgentOptions {
	cli: "gemini" | "claude";
	model: string;
	prompt: string;
	/** Injected for tests; defaults to node:child_process. */
	spawn?: SpawnFn;
}

export interface RunAgentResult {
	/** Concatenated assistant text — never the raw transcript to branch on. */
	text: string;
	/** Full transcript, for logging only. */
	raw: string;
	sessionId: string | null;
	events: StreamEvent[];
}

function buildArgs(model: string): string[] {
	return [
		"--approval-mode",
		"yolo",
		"--output-format",
		"stream-json",
		"-m",
		model,
		"-p",
		"-",
	];
}

const defaultSpawn: SpawnFn = (command, args) =>
	nodeSpawn(command, args, { stdio: ["pipe", "pipe", "pipe"] });

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
			buffer = lines.pop() ?? "";
			for (const line of lines) onLine(line);
		},
	};
}

function waitForExit(child: SpawnedProcess): Promise<number | null> {
	return new Promise((resolve) => {
		child.on("close", resolve);
	});
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

function findSessionId(events: StreamEvent[]): string | null {
	const sessionEvent = events.find(
		(event): event is Extract<StreamEvent, { type: "session_id" }> =>
			event.type === "session_id",
	);
	return sessionEvent?.sessionId ?? null;
}

/**
 * Spawns the agent CLI, writes the prompt on stdin (avoids the ~128 KB argv
 * limit), and returns the parsed text once the process exits.
 *
 * This is the tracer-bullet runner (spec §5.3, Ticket 3): text only. Prompt
 * templating, `{{OUTPUT_SCHEMA}}` injection, the completion signal, tagged
 * structured-output extraction and validation-retry-by-resume all come with
 * the completed runner (Ticket 4).
 */
export async function runAgent(
	options: RunAgentOptions,
): Promise<RunAgentResult> {
	const spawnFn = options.spawn ?? defaultSpawn;
	const child = spawnFn(options.cli, buildArgs(options.model));

	child.stdin.write(options.prompt);
	child.stdin.end();

	const events: StreamEvent[] = [];
	let raw = "";
	const lineBuffer = createLineBuffer((line) => {
		events.push(...parseStreamLine(line));
	});

	child.stdout.on("data", (chunk) => {
		const text = chunk.toString();
		raw += text;
		lineBuffer.push(text);
	});
	child.stderr.on("data", (chunk) => {
		raw += chunk.toString();
	});

	const exitCode = await waitForExit(child);
	lineBuffer.flush();

	if (exitCode !== 0) {
		throw new Error(`${options.cli} exited with code ${exitCode}: ${raw}`);
	}

	return {
		events,
		raw,
		sessionId: findSessionId(events),
		text: collectText(events),
	};
}
