import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseStreamLine, runAgent, type SpawnedProcess } from "../run-agent";

function readFixture(name: string): string {
	return readFileSync(join(import.meta.dirname, "fixtures", name), "utf-8");
}

function streamFromChunks(chunks: string[]): ReadableStream<Uint8Array> {
	const encoder = new TextEncoder();
	return new ReadableStream({
		start(controller) {
			for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
			controller.close();
		},
	});
}

function createFakeProcess(options: {
	exitCode?: number;
	stderrChunks?: string[];
	stdoutChunks?: string[];
}) {
	const write = vi.fn();
	const end = vi.fn();
	const proc: SpawnedProcess = {
		exited: Promise.resolve(options.exitCode ?? 0),
		stderr: streamFromChunks(options.stderrChunks ?? []),
		stdin: { end, write },
		stdout: streamFromChunks(options.stdoutChunks ?? []),
	};
	return { end, proc, write };
}

describe("parseStreamLine", () => {
	it("parses an init event into a session_id event", () => {
		// Arrange
		const line = '{"type":"init","session_id":"sess_1","model":"flash"}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([{ sessionId: "sess_1", type: "session_id" }]);
	});

	it("parses an assistant message into a text event", () => {
		// Arrange
		const line = '{"type":"message","role":"assistant","content":"hello"}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([{ text: "hello", type: "text" }]);
	});

	it("ignores user messages", () => {
		// Arrange
		const line = '{"type":"message","role":"user","content":"hi"}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([]);
	});

	it("parses a tool_use event into a tool_call event", () => {
		// Arrange
		const line =
			'{"type":"tool_use","tool_name":"Bash","tool_id":"t1","parameters":{"command":"echo hi"}}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([{ name: "Bash", type: "tool_call" }]);
	});

	it("parses an activate_skill tool_use event into an activate_skill event", () => {
		// Arrange
		const line =
			'{"type":"tool_use","tool_name":"activate_skill","tool_id":"t1","parameters":{"name":"grilling"}}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([{ skill: "grilling", type: "activate_skill" }]);
	});

	it("parses a result event with stats into result and usage events", () => {
		// Arrange
		const line =
			'{"type":"result","status":"success","stats":{"input_tokens":10,"output_tokens":5}}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([
			{ status: "success", type: "result" },
			{ inputTokens: 10, outputTokens: 5, type: "usage" },
		]);
	});

	it("parses a result event without stats into a result event only", () => {
		// Arrange
		const line = '{"type":"result","status":"error"}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([{ status: "error", type: "result" }]);
	});

	it("parses an error event into a result event with error status", () => {
		// Arrange
		const line = '{"type":"error","message":"API key invalid"}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([{ status: "error", type: "result" }]);
	});

	it("drops tool_result events, which are not part of the normalised union", () => {
		// Arrange
		const line = '{"type":"tool_result","tool_id":"t1","status":"success"}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([]);
	});

	it("drops unrecognised event types", () => {
		// Arrange
		const line = '{"type":"unknown_event"}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([]);
	});

	it("drops malformed JSON", () => {
		// Arrange
		const line = "{not json";

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([]);
	});

	it("drops blank lines", () => {
		// Arrange
		const line = "   ";

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([]);
	});
});

describe("runAgent", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("spawns the CLI with the prompt on stdin and returns the parsed text", async () => {
		// Arrange
		const fixture = readFixture("ping.jsonl");
		const { proc, write, end } = createFakeProcess({ stdoutChunks: [fixture] });
		const spawn = vi.fn().mockReturnValue(proc);

		// Act
		const result = await runAgent({
			cli: "gemini",
			model: "flash",
			prompt: "Reply with a short, friendly pong to confirm you're online.",
			spawn,
		});

		// Assert
		expect(spawn).toHaveBeenCalledWith("gemini", [
			"--approval-mode",
			"yolo",
			"--output-format",
			"stream-json",
			"-m",
			"flash",
			"-p",
			"-",
		]);
		expect(write).toHaveBeenCalledWith(
			"Reply with a short, friendly pong to confirm you're online.",
		);
		expect(end).toHaveBeenCalled();
		expect(result.text).toBe("🏓 pong — I'm online and ready.");
		expect(result.sessionId).toBe("sess_ping_001");
	});

	it("parses a stream split across multiple stdout chunks", async () => {
		// Arrange
		const fixture = readFixture("ping.jsonl");
		const lines = fixture
			.split("\n")
			.filter(Boolean)
			.map((line) => `${line}\n`);
		const { proc } = createFakeProcess({ stdoutChunks: lines });
		const spawn = vi.fn().mockReturnValue(proc);

		// Act
		const result = await runAgent({
			cli: "gemini",
			model: "flash",
			prompt: "ping",
			spawn,
		});

		// Assert
		expect(result.text).toBe("🏓 pong — I'm online and ready.");
	});

	it("throws with the captured transcript when the CLI exits non-zero", async () => {
		// Arrange
		const { proc } = createFakeProcess({
			exitCode: 1,
			stderrChunks: ["quota exceeded"],
		});
		const spawn = vi.fn().mockReturnValue(proc);

		// Act
		const act = runAgent({
			cli: "gemini",
			model: "flash",
			prompt: "ping",
			spawn,
		});

		// Assert
		await expect(act).rejects.toThrow(/exited with code 1/);
	});
});
