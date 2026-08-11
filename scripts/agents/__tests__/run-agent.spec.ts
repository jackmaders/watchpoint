import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { z } from "zod";
import { RunAgentError } from "../failure";
import { logger } from "../logger";
import { runAgent } from "../run-agent";
import type { SpawnedProcess } from "../stream";

vi.mock("../logger");

// The pure functions each have their own spec beside this one (stream, prompt,
// output, failure). This file drives `runAgent` end to end through the `spawn`
// seam and real OUTPUT_DIR files — the two lower-level seams from the spec's
// testing decisions (§6).

const PING = { model: "gpt-5.6-luna", provider: "openai" } as const;

function fixturePath(...segments: string[]): string {
	return join(import.meta.dirname, "fixtures", ...segments);
}

function readFixture(name: string): string {
	return readFileSync(fixturePath(name), "utf-8");
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

/** A spawn double that hands out one fixture per call, in order — models a retry sequence. */
function spawnSequence(...fixtures: string[]) {
	const procs = fixtures.map(
		(fixture) => createFakeProcess({ stdoutChunks: [fixture] }).proc,
	);
	let call = 0;
	return vi.fn().mockImplementation(() => {
		const proc = procs[call] ?? procs.at(-1);
		call += 1;
		return proc;
	});
}

const ResultSchema = z.object({ ok: z.boolean() });

function objectOutput() {
	return { kind: "object", schema: ResultSchema, tag: "result" } as const;
}

describe("runAgent", () => {
	let stdoutWrite: ReturnType<typeof vi.spyOn>;
	let stderrWrite: ReturnType<typeof vi.spyOn>;

	beforeAll(() => {
		stdoutWrite = vi
			.spyOn(process.stdout, "write")
			.mockImplementation(() => true);
		stderrWrite = vi
			.spyOn(process.stderr, "write")
			.mockImplementation(() => true);
	});

	afterAll(() => {
		stdoutWrite.mockRestore();
		stderrWrite.mockRestore();
	});

	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubEnv("OPENAI_API_KEY", "test-key");
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	describe("default spawn", () => {
		// The vitest worker that runs this suite has no `Bun` global at all
		// (Bun's own worker_threads shim doesn't inject one), so there is
		// nothing to `vi.spyOn` — a stub is installed on `globalThis` for the
		// duration of the test instead, standing in for the runtime's real
		// `Bun.spawn` the way `__mocks__` stands in for a real module.
		const originalBun = globalThis.Bun;

		afterEach(() => {
			globalThis.Bun = originalBun;
		});

		it("falls back to Bun.spawn, adapted to the SpawnedProcess shape, when no spawn is injected", async () => {
			// Arrange
			const fixture = readFixture("ping.jsonl");
			const fakeChild = {
				exited: Promise.resolve(0),
				stderr: streamFromChunks([]),
				stdin: { end: vi.fn(), write: vi.fn() },
				stdout: streamFromChunks([fixture]),
			};
			const bunSpawn = vi.fn().mockReturnValue(fakeChild);
			globalThis.Bun = { ...originalBun, spawn: bunSpawn } as typeof Bun;

			// Act
			const result = await runAgent({
				model: PING,
				output: { kind: "prose" },
				promptArgs: {},
				promptFile: fixturePath("prompts", "prose.md"),
			});

			// Assert
			expect(bunSpawn).toHaveBeenCalledWith(
				[
					"codex",
					"exec",
					"--json",
					"-m",
					"gpt-5.6-luna",
					"-c",
					'model_provider="openai"',
					"-",
				],
				{ stderr: "pipe", stdin: "pipe", stdout: "pipe" },
			);
			expect(result.output).toBe("🏓 pong — I'm online and ready.");
		});
	});

	it("resolves the active model and provider from the environment when model is omitted", async () => {
		// Arrange
		vi.stubEnv("AGENT_MODEL", "gpt-5.6-terra");
		vi.stubEnv("AGENT_PROVIDER", "openai");
		const fixture = readFixture("ping.jsonl");
		const { proc } = createFakeProcess({ stdoutChunks: [fixture] });
		const spawn = vi.fn().mockReturnValue(proc);

		// Act
		await runAgent({
			output: { kind: "prose" },
			promptArgs: {},
			promptFile: fixturePath("prompts", "prose.md"),
			spawn,
		});

		// Assert
		expect(spawn).toHaveBeenCalledWith("codex", [
			"exec",
			"--json",
			"-m",
			"gpt-5.6-terra",
			"-c",
			'model_provider="openai"',
			"-",
		]);
	});

	it("rejects a missing provider key before spawning Codex", async () => {
		// Arrange
		vi.stubEnv("OPENAI_API_KEY", "");
		vi.stubEnv("AGENT_API_KEY", "");
		vi.stubEnv("LLM_API_KEY", "");
		const spawn = vi.fn();

		// Act
		const act = runAgent({
			model: PING,
			output: { kind: "prose" },
			promptArgs: {},
			promptFile: fixturePath("prompts", "prose.md"),
			spawn,
		});

		// Assert
		await expect(act).rejects.toThrow(/OPENAI_API_KEY/);
		expect(spawn).not.toHaveBeenCalled();
	});

	describe("prose output", () => {
		it("spawns the CLI with the templated prompt on stdin and returns the parsed text", async () => {
			// Arrange
			const fixture = readFixture("ping.jsonl");
			const { proc, write, end } = createFakeProcess({
				stdoutChunks: [fixture],
			});
			const spawn = vi.fn().mockReturnValue(proc);

			// Act
			const result = await runAgent({
				model: PING,
				output: { kind: "prose" },
				promptArgs: {},
				promptFile: fixturePath("prompts", "prose.md"),
				spawn,
			});

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
			expect(write).toHaveBeenCalledWith(
				"Reply with a short, friendly pong to confirm you're online.\n",
			);
			expect(end).toHaveBeenCalled();
			expect(result.output).toBe("🏓 pong — I'm online and ready.");
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
				model: PING,
				output: { kind: "prose" },
				promptArgs: {},
				promptFile: fixturePath("prompts", "prose.md"),
				spawn,
			});

			// Assert
			expect(result.output).toBe("🏓 pong — I'm online and ready.");
		});

		it("buffers chunks that carry no newline until the line completes", async () => {
			// Arrange
			// Every chunk but the last is a fragment of one JSONL record, so the
			// buffer has to hold on to them rather than parse anything yet.
			const fixture = readFixture("ping.jsonl");
			const chunkSize = 24;
			const chunks = Array.from(
				{ length: Math.ceil(fixture.length / chunkSize) },
				(_unused, index) =>
					fixture.slice(index * chunkSize, (index + 1) * chunkSize),
			);
			const { proc } = createFakeProcess({ stdoutChunks: chunks });
			const spawn = vi.fn().mockReturnValue(proc);

			// Act
			const result = await runAgent({
				model: PING,
				output: { kind: "prose" },
				promptArgs: {},
				promptFile: fixturePath("prompts", "prose.md"),
				spawn,
			});

			// Assert
			expect(result.output).toBe("🏓 pong — I'm online and ready.");
		});

		it("flushes a final line that arrives with no trailing newline", async () => {
			// Arrange
			const fixture = readFixture("ping.jsonl").trimEnd(); // strip the final "\n"
			const { proc } = createFakeProcess({ stdoutChunks: [fixture] });
			const spawn = vi.fn().mockReturnValue(proc);

			// Act
			const result = await runAgent({
				model: PING,
				output: { kind: "prose" },
				promptArgs: {},
				promptFile: fixturePath("prompts", "prose.md"),
				spawn,
			});

			// Assert
			expect(result.output).toBe("🏓 pong — I'm online and ready.");
		});
	});

	describe("prompt templating", () => {
		it("substitutes promptArgs and injects {{OUTPUT_SCHEMA}} from the Zod schema", async () => {
			// Arrange
			const fixture = readFixture("object-success.jsonl");
			const { proc, write } = createFakeProcess({ stdoutChunks: [fixture] });
			const spawn = vi.fn().mockReturnValue(proc);

			// Act
			await runAgent({
				model: PING,
				output: objectOutput(),
				promptArgs: { TASK: "the ticket" },
				promptFile: fixturePath("prompts", "object.md"),
				spawn,
			});

			// Assert
			const [sentPrompt] = write.mock.calls[0] as [string];
			expect(sentPrompt).toContain("Produce a result for the ticket.");
			expect(sentPrompt).toContain('"properties"');
			expect(sentPrompt).toContain('"ok"');
		});
	});

	describe("structured output", () => {
		it("extracts, validates, and returns the tagged payload", async () => {
			// Arrange
			const fixture = readFixture("object-success.jsonl");
			const { proc } = createFakeProcess({ stdoutChunks: [fixture] });
			const spawn = vi.fn().mockReturnValue(proc);

			// Act
			const result = await runAgent({
				model: PING,
				output: objectOutput(),
				promptArgs: { TASK: "the ticket" },
				promptFile: fixturePath("prompts", "object.md"),
				spawn,
			});

			// Assert
			expect(result.output).toEqual({ ok: true });
		});

		it("stops the transcript at the completion signal and reports it on the result", async () => {
			// Arrange
			const fixture = readFixture("object-success.jsonl");
			const { proc } = createFakeProcess({ stdoutChunks: [fixture] });
			const spawn = vi.fn().mockReturnValue(proc);

			// Act
			const result = await runAgent({
				model: PING,
				output: objectOutput(),
				promptArgs: { TASK: "the ticket" },
				promptFile: fixturePath("prompts", "object.md"),
				spawn,
			});

			// Assert
			expect(result.completionSignal).toBe("<promise>COMPLETE</promise>");
			// The raw transcript keeps the full stream, including text after the
			// signal — only extraction/validation stops there, not diagnostics.
			expect(result.raw).toContain("Anything else?");
		});
	});

	describe("retry by resume", () => {
		it("resumes the same session with only the validation error on a malformed payload", async () => {
			// Arrange
			const spawn = spawnSequence(
				readFixture("malformed-json.jsonl"),
				readFixture("retry-success.jsonl"),
			);

			// Act
			const result = await runAgent({
				model: PING,
				output: objectOutput(),
				promptArgs: { TASK: "the ticket" },
				promptFile: fixturePath("prompts", "object.md"),
				spawn,
			});

			// Assert
			expect(result.output).toEqual({ ok: true });
			expect(spawn).toHaveBeenCalledTimes(2);
			expect(spawn).toHaveBeenNthCalledWith(2, "codex", [
				"exec",
				"resume",
				"--json",
				"-m",
				"gpt-5.6-luna",
				"-c",
				'model_provider="openai"',
				"sess_retry_001",
				"-",
			]);
		});

		it("sends only the validation error as the retry prompt, not the original prompt", async () => {
			// Arrange
			const spawn = spawnSequence(
				readFixture("malformed-json.jsonl"),
				readFixture("retry-success.jsonl"),
			);

			// Act
			await runAgent({
				model: PING,
				output: objectOutput(),
				promptArgs: { TASK: "the ticket" },
				promptFile: fixturePath("prompts", "object.md"),
				spawn,
			});

			// Assert
			const secondCallProc = spawn.mock.results[1]?.value as SpawnedProcess;
			expect(secondCallProc.stdin.write).toHaveBeenCalledWith(
				expect.stringContaining("Failed to parse JSON"),
			);
		});

		it("fails instead of retrying when the CLI never reported a session id to resume", async () => {
			// Arrange
			// Without a session id there is nothing to resume, and the retry
			// prompt is only the validation error — resuming nothing would send
			// a bare error message with none of the original task context.
			const spawn = spawnSequence(
				readFixture("malformed-no-session.jsonl"),
				readFixture("retry-success.jsonl"),
			);

			// Act
			const act = runAgent({
				model: PING,
				output: objectOutput(),
				promptArgs: { TASK: "the ticket" },
				promptFile: fixturePath("prompts", "object.md"),
				spawn,
			});

			// Assert
			await expect(act).rejects.toMatchObject({ failureClass: "bad-output" });
			expect(spawn).toHaveBeenCalledTimes(1);
		});

		it("throws a bad-output RunAgentError once maxRetries is exhausted", async () => {
			// Arrange
			const fixture = readFixture("malformed-json.jsonl");
			const spawn = spawnSequence(fixture, fixture, fixture);

			// Act
			const act = runAgent({
				maxRetries: 2,
				model: PING,
				output: objectOutput(),
				promptArgs: { TASK: "the ticket" },
				promptFile: fixturePath("prompts", "object.md"),
				spawn,
			});

			// Assert
			await expect(act).rejects.toThrow(RunAgentError);
			await expect(act).rejects.toMatchObject({ failureClass: "bad-output" });
			expect(spawn).toHaveBeenCalledTimes(3);
		});

		it("does not retry at all when maxRetries is 0", async () => {
			// Arrange
			const spawn = spawnSequence(
				readFixture("malformed-json.jsonl"),
				readFixture("retry-success.jsonl"),
			);

			// Act
			const act = runAgent({
				maxRetries: 0,
				model: PING,
				output: objectOutput(),
				promptArgs: { TASK: "the ticket" },
				promptFile: fixturePath("prompts", "object.md"),
				spawn,
			});

			// Assert
			await expect(act).rejects.toMatchObject({ failureClass: "bad-output" });
			expect(spawn).toHaveBeenCalledTimes(1);
		});
	});

	describe("expectSkill", () => {
		it("succeeds when the expected skill activated during the run", async () => {
			// Arrange
			const fixture = readFixture("object-success.jsonl");
			const { proc } = createFakeProcess({ stdoutChunks: [fixture] });
			const spawn = vi.fn().mockReturnValue(proc);

			// Act
			const result = await runAgent({
				expectSkill: "to-spec",
				model: PING,
				output: objectOutput(),
				promptArgs: { TASK: "the ticket" },
				promptFile: fixturePath("prompts", "object.md"),
				spawn,
			});

			// Assert
			expect(result.output).toEqual({ ok: true });
		});

		it("throws a skill-miss RunAgentError when the expected skill never activated", async () => {
			// Arrange
			const fixture = readFixture("object-success.jsonl");
			const { proc } = createFakeProcess({ stdoutChunks: [fixture] });
			const spawn = vi.fn().mockReturnValue(proc);

			// Act
			const act = runAgent({
				expectSkill: "grilling",
				model: PING,
				output: objectOutput(),
				promptArgs: { TASK: "the ticket" },
				promptFile: fixturePath("prompts", "object.md"),
				spawn,
			});

			// Assert
			await expect(act).rejects.toThrow(RunAgentError);
			await expect(act).rejects.toMatchObject({ failureClass: "skill-miss" });
		});
	});

	describe("failure classification", () => {
		it("throws a quota RunAgentError on exit 1 with rate-limit text", async () => {
			// Arrange
			const { proc } = createFakeProcess({
				exitCode: 1,
				stderrChunks: ["Error: rate limit exceeded"],
			});
			const spawn = vi.fn().mockReturnValue(proc);

			// Act
			const act = runAgent({
				model: PING,
				output: { kind: "prose" },
				promptArgs: {},
				promptFile: fixturePath("prompts", "prose.md"),
				spawn,
			});

			// Assert
			await expect(act).rejects.toThrow(RunAgentError);
			await expect(act).rejects.toMatchObject({ failureClass: "quota" });
		});

		it("throws a turn-limit RunAgentError on exit 53", async () => {
			// Arrange
			const { proc } = createFakeProcess({ exitCode: 53 });
			const spawn = vi.fn().mockReturnValue(proc);

			// Act
			const act = runAgent({
				model: PING,
				output: { kind: "prose" },
				promptArgs: {},
				promptFile: fixturePath("prompts", "prose.md"),
				spawn,
			});

			// Assert
			await expect(act).rejects.toThrow(RunAgentError);
			await expect(act).rejects.toMatchObject({ failureClass: "turn-limit" });
		});

		it("throws a bad-input RunAgentError on exit 42", async () => {
			// Arrange
			const { proc } = createFakeProcess({ exitCode: 42 });
			const spawn = vi.fn().mockReturnValue(proc);

			// Act
			const act = runAgent({
				model: PING,
				output: { kind: "prose" },
				promptArgs: {},
				promptFile: fixturePath("prompts", "prose.md"),
				spawn,
			});

			// Assert
			await expect(act).rejects.toThrow(RunAgentError);
			await expect(act).rejects.toMatchObject({ failureClass: "bad-input" });
		});

		it("throws a plain, unclassified error on an exit code outside the failure table", async () => {
			// Arrange
			const { proc } = createFakeProcess({
				exitCode: 2,
				stderrChunks: ["usage: codex [options]"],
			});
			const spawn = vi.fn().mockReturnValue(proc);

			// Act
			const act = runAgent({
				model: PING,
				output: { kind: "prose" },
				promptArgs: {},
				promptFile: fixturePath("prompts", "prose.md"),
				spawn,
			});

			// Assert
			await expect(act).rejects.toThrow(/exited with code 2/);
			await expect(act).rejects.not.toBeInstanceOf(RunAgentError);
		});

		it("throws a plain, unclassified error on exit 1 without rate-limit text", async () => {
			// Arrange
			const { proc } = createFakeProcess({
				exitCode: 1,
				stderrChunks: ["network timeout"],
			});
			const spawn = vi.fn().mockReturnValue(proc);

			// Act
			const act = runAgent({
				model: PING,
				output: { kind: "prose" },
				promptArgs: {},
				promptFile: fixturePath("prompts", "prose.md"),
				spawn,
			});

			// Assert
			await expect(act).rejects.toThrow(/exited with code 1/);
			await expect(act).rejects.not.toBeInstanceOf(RunAgentError);
		});

		it("classifies on stderr alone, so quota wording in the model's own output cannot misfile a crash", async () => {
			// Arrange
			// The transcript echoes promptArgs back; only stderr is evidence.
			const { proc } = createFakeProcess({
				exitCode: 1,
				stderrChunks: ["Segmentation fault"],
				stdoutChunks: [
					'{"type":"message","role":"assistant","content":"the issue mentions a rate limit"}\n',
				],
			});
			const spawn = vi.fn().mockReturnValue(proc);

			// Act
			const act = runAgent({
				model: PING,
				output: { kind: "prose" },
				promptArgs: {},
				promptFile: fixturePath("prompts", "prose.md"),
				spawn,
			});

			// Assert
			await expect(act).rejects.not.toBeInstanceOf(RunAgentError);
		});
	});

	describe("artifacts", () => {
		let outputDir: string;
		const originalOutputDir = process.env.OUTPUT_DIR;

		beforeEach(() => {
			outputDir = mkdtempSync(join(tmpdir(), "run-agent-usage-"));
			process.env.OUTPUT_DIR = outputDir;
		});

		afterEach(() => {
			process.env.OUTPUT_DIR = originalOutputDir;
		});

		it("appends usage on a successful run and writes no failure reason", async () => {
			// Arrange
			const fixture = readFixture("object-success.jsonl");
			const { proc } = createFakeProcess({ stdoutChunks: [fixture] });
			const spawn = vi.fn().mockReturnValue(proc);

			// Act
			await runAgent({
				model: PING,
				output: objectOutput(),
				promptArgs: { TASK: "the ticket" },
				promptFile: fixturePath("prompts", "object.md"),
				spawn,
			});

			// Assert
			const usage = readFileSync(join(outputDir, "usage.jsonl"), "utf-8");
			expect(JSON.parse(usage.trim())).toMatchObject({
				cli: "codex",
				inputTokens: 40,
				model: "gpt-5.6-luna",
				outputTokens: 20,
				requests: 1,
			});
			expect(() =>
				readFileSync(join(outputDir, "failure_reason.txt"), "utf-8"),
			).toThrow();
		});

		it("writes the failure class and message to failure_reason.txt on a classified failure", async () => {
			// Arrange
			const { proc } = createFakeProcess({ exitCode: 53 });
			const spawn = vi.fn().mockReturnValue(proc);

			// Act
			const act = runAgent({
				model: PING,
				output: { kind: "prose" },
				promptArgs: {},
				promptFile: fixturePath("prompts", "prose.md"),
				spawn,
			});
			await expect(act).rejects.toThrow(RunAgentError);

			// Assert
			const failureReason = readFileSync(
				join(outputDir, "failure_reason.txt"),
				"utf-8",
			);
			expect(failureReason).toContain("turn-limit");
		});

		it("still appends usage, but writes no failure_reason.txt, for an unclassified failure", async () => {
			// Arrange
			// Usage is logged on every run; failure_reason.txt is deliberately
			// skipped when there is no FailureClass to report — the thrown
			// Error's own message carries the diagnostic instead.
			const { proc } = createFakeProcess({
				exitCode: 1,
				stderrChunks: ["network timeout"],
			});
			const spawn = vi.fn().mockReturnValue(proc);

			// Act
			const act = runAgent({
				model: PING,
				output: { kind: "prose" },
				promptArgs: {},
				promptFile: fixturePath("prompts", "prose.md"),
				spawn,
			});
			await expect(act).rejects.toThrow(/exited with code 1/);

			// Assert
			const usage = readFileSync(join(outputDir, "usage.jsonl"), "utf-8");
			expect(JSON.parse(usage.trim())).toMatchObject({
				cli: "codex",
				requests: 1,
			});
			expect(() =>
				readFileSync(join(outputDir, "failure_reason.txt"), "utf-8"),
			).toThrow();
		});

		it("sums usage across every attempt of a retried run", async () => {
			// Arrange
			const spawn = spawnSequence(
				readFixture("malformed-json.jsonl"),
				readFixture("retry-success.jsonl"),
			);

			// Act
			const result = await runAgent({
				model: PING,
				output: objectOutput(),
				promptArgs: { TASK: "the ticket" },
				promptFile: fixturePath("prompts", "object.md"),
				spawn,
			});

			// Assert
			expect(result.usage).toEqual({
				inputTokens: 40,
				outputTokens: 20,
				requests: 2,
			});
		});

		it("warns instead of writing anything when OUTPUT_DIR is unset", async () => {
			// Arrange
			Reflect.deleteProperty(process.env, "OUTPUT_DIR");
			const fixture = readFixture("ping.jsonl");
			const { proc } = createFakeProcess({ stdoutChunks: [fixture] });
			const spawn = vi.fn().mockReturnValue(proc);

			// Act
			await runAgent({
				model: PING,
				output: { kind: "prose" },
				promptArgs: {},
				promptFile: fixturePath("prompts", "prose.md"),
				spawn,
			});

			// Assert
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining("OUTPUT_DIR is unset"),
			);
		});
	});
});
