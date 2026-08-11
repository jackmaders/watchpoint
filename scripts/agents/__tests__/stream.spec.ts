import { describe, expect, it, vi } from "vitest";
import type { ModelConfig } from "../models";
import {
	buildCodexArgs,
	CODEX_BYPASS_SANDBOX_ENV,
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

	it("drops legacy session start events", () => {
		// Arrange
		const line = '{"type":"session.started","id":"session_1"}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([]);
	});

	it("drops session IDs from non-Codex events", () => {
		// Arrange
		const line = '{"type":"custom","session_id":"session_1"}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([]);
	});

	it("drops text deltas outside completed Codex agent messages", () => {
		// Arrange
		const line =
			'{"type":"item.delta","item_id":"item_1","delta":{"type":"text_delta","text":"hello"}}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([]);
	});

	it("drops string-form deltas", () => {
		// Arrange
		const line = '{"type":"item.delta","delta":"hello"}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([]);
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

	it("accepts decoded Codex function arguments", () => {
		// Arrange
		const line =
			'{"type":"item.started","item":{"type":"function_call","name":"activate_skill","arguments":{"name":"tdd"}}}';

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

	it("rejects legacy non-Codex event shapes", () => {
		// Arrange
		const line = '{"type":"message","role":"assistant","content":"hello"}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([]);
	});

	it("drops legacy init events", () => {
		// Arrange
		const line = '{"type":"init","session_id":"sess_1","model":"flash"}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([]);
	});

	it("drops legacy assistant messages", () => {
		// Arrange
		const line = '{"type":"message","role":"assistant","content":"hello"}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([]);
	});

	it("drops unrecognised assistant event types", () => {
		// Arrange
		const line =
			'{"type":"response.completed","role":"assistant","content":"done"}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([]);
	});

	it("drops text events without a text delta", () => {
		// Arrange
		const line = '{"type":"text"}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([]);
	});

	it("drops completed agent messages without text", () => {
		// Arrange
		const line = '{"type":"item.completed","item":{"type":"agent_message"}}';

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

	it("drops legacy tool events", () => {
		// Arrange
		const line =
			'{"type":"tool_use","tool_name":"Bash","tool_id":"t1","parameters":{"command":"echo hi"}}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([]);
	});

	it("drops legacy skill activations", () => {
		// Arrange
		const line =
			'{"type":"tool_use","tool_name":"activate_skill","tool_id":"t1","parameters":{"name":"grilling"}}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([]);
	});

	it("drops legacy result events", () => {
		// Arrange
		const line =
			'{"type":"result","status":"success","stats":{"input_tokens":10,"output_tokens":5}}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([]);
	});

	it("drops legacy error results", () => {
		// Arrange
		const line = '{"type":"result","status":"error"}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([]);
	});

	it("drops standalone errors outside the Codex turn contract", () => {
		// Arrange
		const line = '{"type":"error","message":"API key invalid"}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([]);
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

	it("drops a Codex function call with no name", () => {
		// Arrange
		const line = '{"type":"item.started","item":{"type":"function_call"}}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([]);
	});

	it("parses a named Codex function call", () => {
		// Arrange
		const line =
			'{"type":"item.started","item":{"type":"function_call","name":"run_command"}}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([{ name: "run_command", type: "tool_call" }]);
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

	it("reads the skill name from Codex function-call arguments", () => {
		// Arrange
		const line =
			'{"type":"item.started","item":{"type":"function_call","name":"activate_skill","arguments":"{\\"skill\\":\\"grilling\\"}"}}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([{ skill: "grilling", type: "activate_skill" }]);
	});

	it("defaults token counts to 0 when Codex usage carries no token values", () => {
		// Arrange
		const line = '{"type":"turn.completed","usage":{}}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([
			{ status: "success", type: "result" },
			{ inputTokens: 0, outputTokens: 0, type: "usage" },
		]);
	});

	it("parses a completed turn without usage", () => {
		// Arrange
		const line = '{"type":"turn.completed"}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([{ status: "success", type: "result" }]);
	});

	it("parses failed Codex turns as errors", () => {
		// Arrange
		const line = '{"type":"turn.failed"}';

		// Act
		const events = parseStreamLine(line);

		// Assert
		expect(events).toEqual([{ status: "error", type: "result" }]);
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

	it("builds Codex commands for the supported OpenAI execution path", () => {
		// Arrange
		// Act
		const freshArgs = buildCodexArgs(modelConfig);
		const resumedArgs = buildCodexArgs(modelConfig, "thread_1");

		// Assert
		expect(freshArgs).toEqual(["exec", "--json", "-m", "gpt-5.6-luna", "-"]);
		expect(resumedArgs).toEqual([
			"exec",
			"resume",
			"--json",
			"-m",
			"gpt-5.6-luna",
			"thread_1",
			"-",
		]);
	});

	it("bypasses Codex's nested sandbox only when the workflow opts in", () => {
		// Arrange
		// Act
		const args = buildCodexArgs(modelConfig, undefined, true);

		// Assert
		expect(args).toEqual([
			"exec",
			"--json",
			"-m",
			"gpt-5.6-luna",
			"--dangerously-bypass-approvals-and-sandbox",
			"-",
		]);
	});

	it("passes the CI sandbox opt-in from the process environment to Codex", async () => {
		// Arrange
		const processChild: SpawnedProcess = {
			exited: Promise.resolve(0),
			stderr: streamFromChunks([]),
			stdin: { end: vi.fn(), write: vi.fn() },
			stdout: streamFromChunks([]),
		};
		const spawn = vi.fn().mockReturnValue(processChild);
		const environment = { [CODEX_BYPASS_SANDBOX_ENV]: "1" };

		// Act
		await runProcess(
			spawn,
			modelConfig,
			"prompt",
			undefined,
			undefined,
			environment,
		);

		// Assert
		expect(spawn).toHaveBeenCalledWith(
			"codex",
			[
				"exec",
				"--json",
				"-m",
				"gpt-5.6-luna",
				"--dangerously-bypass-approvals-and-sandbox",
				"-",
			],
			{ env: environment },
		);
	});

	it("mirrors completed agent messages without exposing raw process output", async () => {
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
				'{"type":"thread.started","thread_id":"thread_1"}\n{"type":"item.completed","item":{"type":"agent_message","text":"hello"}}\n',
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
			"-",
		]);
		expect(write).toHaveBeenCalledWith("prompt\n");
		expect(end).toHaveBeenCalled();
		expect(stdoutWrite).toHaveBeenCalledWith("hello");
		expect(stderrWrite).not.toHaveBeenCalled();
		expect(result.events).toEqual([
			{ sessionId: "thread_1", type: "session_id" },
			{ text: "hello", type: "text" },
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
		expect(stdoutWrite).not.toHaveBeenCalled();
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
		const result = await runProcess(spawn, modelConfig, "prompt", undefined, 5);

		// Assert
		expect(result).toMatchObject({ timedOut: true, timeoutMs: 5 });
		expect(kill).toHaveBeenCalled();
	});
});
