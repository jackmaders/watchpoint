import { describe, expect, it, vi } from "vitest";
import type { ModelConfig } from "../models";
import {
	buildCodexArgs,
	defaultSpawn,
	parseStreamLine,
	runProcess,
	type SpawnedProcess,
} from "../stream";

// The rest of stream.ts — the spawn seam, line framing, and the projections
// over a finished event list — is exercised through `runAgent` in
// run-agent.spec.ts, where a real (faked) process drives it end to end.

describe("parseStreamLine", () => {
	it("parses a Codex thread.started event into a session_id event", () => {
		// Arrange
		const line = '{"type":"thread.started","thread_id":"thread_1"}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([{ sessionId: "thread_1", type: "session_id" }]);
	});

	it("uses an init event's ID when no session ID is present", () => {
		// Arrange
		const line = '{"type":"session.started","id":"session_1"}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([{ sessionId: "session_1", type: "session_id" }]);
	});

	it("preserves a session ID carried by a non-init event", () => {
		// Arrange
		const line = '{"type":"custom","session_id":"session_1"}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([{ sessionId: "session_1", type: "session_id" }]);
	});

	it("parses a Codex text delta event into a text event", () => {
		// Arrange
		const line =
			'{"type":"item.delta","item_id":"item_1","delta":{"type":"text_delta","text":"hello"}}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([{ text: "hello", type: "text" }]);
	});

	it("parses a string-form Codex text delta", () => {
		// Arrange
		const line = '{"type":"item.delta","delta":"hello"}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([{ text: "hello", type: "text" }]);
	});

	it("parses a completed Codex agent message", () => {
		// Arrange
		const line =
			'{"type":"item.completed","item":{"type":"agent_message","text":"done"}}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([{ text: "done", type: "text" }]);
	});

	it("ignores completed non-message Codex items", () => {
		// Arrange
		const line =
			'{"type":"item.completed","item":{"type":"user_message","text":"done"}}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([]);
	});

	it("parses a Codex activate_skill function call into an activate_skill event", () => {
		// Arrange
		const line =
			'{"type":"item.started","item":{"type":"function_call","name":"activate_skill","arguments":"{\\"name\\":\\"tdd\\"}"}}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([{ skill: "tdd", type: "activate_skill" }]);
	});

	it("ignores malformed tool argument JSON", () => {
		// Arrange
		const line =
			'{"type":"item.started","item":{"type":"function_call","name":"activate_skill","arguments":"{"}}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([]);
	});

	it("parses a Codex turn.completed event into result and usage events", () => {
		// Arrange
		const line =
			'{"type":"turn.completed","usage":{"input_tokens":12,"cached_input_tokens":3,"output_tokens":8}}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([
			{ status: "success", type: "result" },
			{ inputTokens: 12, outputTokens: 8, type: "usage" },
		]);
	});

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

	it("parses assistant text carried by a non-message event", () => {
		// Arrange
		const line =
			'{"type":"response.completed","role":"assistant","content":"done"}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([{ text: "done", type: "text" }]);
	});

	it("drops text events without a text delta", () => {
		// Arrange
		const line = '{"type":"text"}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([]);
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

	it("drops an init event with no session_id", () => {
		// Arrange
		const line = '{"type":"init","model":"flash"}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([]);
	});

	it("drops a parsed JSON value that is not an object", () => {
		// Arrange
		const line = "42";

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([]);
	});

	it("drops an object with no type field", () => {
		// Arrange
		const line = '{"foo":"bar"}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([]);
	});

	it("drops a tool_use event with no tool_name", () => {
		// Arrange
		const line = '{"type":"tool_use","tool_id":"t1","parameters":{}}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([]);
	});

	it("drops an activate_skill tool_use with no parameters", () => {
		// Arrange
		const line =
			'{"type":"tool_use","tool_name":"activate_skill","tool_id":"t1"}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([]);
	});

	it("reads the skill name from parameters.skill when parameters.name is absent", () => {
		// Arrange
		const line =
			'{"type":"tool_use","tool_name":"activate_skill","tool_id":"t1","parameters":{"skill":"grilling"}}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([{ skill: "grilling", type: "activate_skill" }]);
	});

	it("defaults token counts to 0 when stats carries non-numeric values", () => {
		// Arrange
		const line = '{"type":"result","status":"success","stats":{}}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([
			{ status: "success", type: "result" },
			{ inputTokens: 0, outputTokens: 0, type: "usage" },
		]);
	});
});

describe("Codex process execution", () => {
	const modelConfig: ModelConfig = {
		model: "gpt-5.6-luna",
		provider: "openai",
	};

	function streamFromChunks(chunks: string[]): ReadableStream<Uint8Array> {
		const encoder = new TextEncoder();
		return new ReadableStream({
			start(controller) {
				for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
				controller.close();
			},
		});
	}

	it("adapts Bun subprocess termination through the default spawn seam", () => {
		// Arrange
		const kill = vi.fn();
		const originalBun = globalThis.Bun;
		const child = {
			exited: Promise.resolve(0),
			kill,
			stderr: streamFromChunks([]),
			stdin: { end: vi.fn(), write: vi.fn() },
			stdout: streamFromChunks([]),
		};
		const spawn = vi.fn().mockReturnValue(child);
		globalThis.Bun = { ...originalBun, spawn } as typeof Bun;

		try {
			// Act
			const processChild = defaultSpawn("codex", ["exec"]);
			processChild.kill?.();

			// Assert
			expect(kill).toHaveBeenCalledOnce();
		} finally {
			globalThis.Bun = originalBun;
		}
	});

	it("builds Codex commands with the model_provider setting and resume subcommand", () => {
		// Arrange
		// Act
		const freshArgs = buildCodexArgs(modelConfig);
		const resumedArgs = buildCodexArgs(modelConfig, "thread_1");

		// Assert
		expect(freshArgs).toEqual([
			"exec",
			"--json",
			"-m",
			"gpt-5.6-luna",
			"-c",
			'model_provider="openai"',
			"-",
		]);
		expect(resumedArgs).toEqual([
			"exec",
			"resume",
			"--json",
			"-m",
			"gpt-5.6-luna",
			"-c",
			'model_provider="openai"',
			"thread_1",
			"-",
		]);
	});

	it("mirrors stdout and stderr while sending the prompt through stdin", async () => {
		// Arrange
		const write = vi.fn();
		const end = vi.fn();
		const stdoutWrite = vi
			.spyOn(process.stdout, "write")
			.mockImplementation(() => true);
		const stderrWrite = vi
			.spyOn(process.stderr, "write")
			.mockImplementation(() => true);
		const processChild: SpawnedProcess = {
			exited: Promise.resolve(0),
			stderr: streamFromChunks(["diagnostic\n"]),
			stdin: { end, write },
			stdout: streamFromChunks([
				'{"type":"thread.started","thread_id":"thread_1"}\n',
			]),
		};
		const spawn = vi.fn().mockReturnValue(processChild);

		// Act
		const result = await runProcess(spawn, modelConfig, "prompt\n");

		// Assert
		expect(spawn).toHaveBeenCalledWith("codex", [
			"exec",
			"--json",
			"-m",
			"gpt-5.6-luna",
			"-c",
			'model_provider="openai"',
			"-",
		]);
		expect(write).toHaveBeenCalledWith("prompt\n");
		expect(end).toHaveBeenCalled();
		expect(stdoutWrite).toHaveBeenCalledWith(
			'{"type":"thread.started","thread_id":"thread_1"}\n',
		);
		expect(stderrWrite).toHaveBeenCalledWith("diagnostic\n");
		expect(result.events).toEqual([
			{ sessionId: "thread_1", type: "session_id" },
		]);
		stdoutWrite.mockRestore();
		stderrWrite.mockRestore();
	});

	it("flushes a partial decoder chunk after the process exits", async () => {
		// Arrange
		const stdoutWrite = vi
			.spyOn(process.stdout, "write")
			.mockImplementation(() => true);
		const processChild: SpawnedProcess = {
			exited: Promise.resolve(0),
			stderr: streamFromChunks([]),
			stdin: { end: vi.fn(), write: vi.fn() },
			stdout: new ReadableStream({
				start(controller) {
					controller.enqueue(new Uint8Array([0xc3]));
					controller.close();
				},
			}),
		};
		const spawn = vi.fn().mockReturnValue(processChild);

		// Act
		const result = await runProcess(spawn, modelConfig, "prompt");

		// Assert
		expect(result.raw).toBe("�");
		expect(stdoutWrite).toHaveBeenCalledWith("�");
		stdoutWrite.mockRestore();
	});

	it("kills and rejects a process that exceeds the execution timeout", async () => {
		// Arrange
		const kill = vi.fn();
		const neverSettles = new Promise<number>(() => undefined);
		const pendingStream = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(new TextEncoder().encode("still running"));
			},
		});
		const processChild: SpawnedProcess = {
			exited: neverSettles,
			kill,
			stderr: pendingStream,
			stdin: { end: vi.fn(), write: vi.fn() },
			stdout: new ReadableStream<Uint8Array>({
				start(controller) {
					controller.enqueue(new TextEncoder().encode("still running"));
				},
			}),
		};
		const spawn = vi.fn().mockReturnValue(processChild);

		// Act
		const act = runProcess(spawn, modelConfig, "prompt", undefined, 5);

		// Assert
		await expect(act).rejects.toThrow(/ timed out .*gpt-5\.6-luna.*openai/);
		expect(kill).toHaveBeenCalled();
	});
});
