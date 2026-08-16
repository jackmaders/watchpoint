import { describe, expect, it } from "vitest";
import { DefaultAgentRunner, MockAgentRunner } from "../agent-runner";

describe("MockAgentRunner", () => {
	it("records execution options and returns default simulated commit result", async () => {
		// Arrange
		const runner = new MockAgentRunner();

		// Act
		const result = await runner.run({
			attempt: 1,
			branch: "feat/issue-1",
			maxAttempts: 3,
			prompt: "Implement ticket 1",
			worktreePath: "/tmp/worktrees/feat-issue-1",
		});
		const runs = runner.getRuns();

		// Assert
		expect(result.commits).toHaveLength(1);
		expect(result.commits[0].sha).toBeDefined();
		expect(runs).toHaveLength(1);
		expect(runs[0].prompt).toBe("Implement ticket 1");
		expect(runs[0].attempt).toBe(1);
	});

	it("returns custom simulated run result when configured", async () => {
		// Arrange
		const runner = new MockAgentRunner();
		runner.setRunResult({
			commits: [{ sha: "custom-sha-123" }],
			stdout: "Custom agent run output",
		});

		// Act
		const result = await runner.run({
			attempt: 2,
			branch: "feat/custom",
			maxAttempts: 3,
			prompt: "Custom task",
		});

		// Assert
		expect(result.commits).toEqual([{ sha: "custom-sha-123" }]);
		expect(result.stdout).toBe("Custom agent run output");
	});

	it("throws error when simulated failure is configured", async () => {
		// Arrange
		const runner = new MockAgentRunner();
		runner.simulateFailure("Sandcastle sandbox crashed");

		// Act
		const runPromise = runner.run({
			attempt: 1,
			branch: "feat/crash",
			maxAttempts: 3,
			prompt: "Crash task",
		});

		// Assert
		await expect(runPromise).rejects.toThrow("Sandcastle sandbox crashed");
	});

	it("throws error when AbortSignal is already aborted", async () => {
		// Arrange
		const runner = new MockAgentRunner();
		const controller = new AbortController();
		controller.abort();

		// Act
		const runPromise = runner.run({
			attempt: 1,
			branch: "feat/aborted",
			maxAttempts: 3,
			prompt: "Abort task",
			signal: controller.signal,
		});

		// Assert
		await expect(runPromise).rejects.toThrow("Agent run aborted");
	});
});

describe("DefaultAgentRunner", () => {
	it("executes default agy agent with non-interactive flag and returns commits from git log", async () => {
		// Arrange
		const executedCmds: {
			cmd: readonly string[];
			cwd?: string;
			env?: Record<string, string | undefined>;
		}[] = [];
		const processRunner = async (
			cmd: readonly string[],
			opts?: { cwd?: string; env?: Record<string, string | undefined> },
		) => {
			executedCmds.push({ cmd, cwd: opts?.cwd, env: opts?.env });
			if (cmd[0] === "git" && cmd[1] === "log") {
				return {
					exitCode: 0,
					stderr: "",
					stdout: "abc1234 feat: implement feature\ndef5678 fix: fix bug",
				};
			}
			return { exitCode: 0, stderr: "", stdout: "Agent completed task" };
		};

		const runner = new DefaultAgentRunner({ processRunner });

		// Act
		const result = await runner.run({
			attempt: 1,
			branch: "feat/feature-1",
			maxAttempts: 3,
			prompt: "Build feature 1",
			worktreePath: "/tmp/worktrees/feat-1",
		});

		// Assert
		expect(executedCmds).toHaveLength(2);
		expect(executedCmds[0].cmd).toEqual(["agy", "-p", "Build feature 1"]);
		expect(executedCmds[0].cwd).toBe("/tmp/worktrees/feat-1");
		expect(executedCmds[0].env?.AGY_NON_INTERACTIVE).toBe("1");
		expect(executedCmds[1].cmd).toEqual([
			"git",
			"log",
			"--oneline",
			"main..HEAD",
		]);
		expect(executedCmds[1].cwd).toBe("/tmp/worktrees/feat-1");
		expect(result.commits).toEqual([{ sha: "abc1234" }, { sha: "def5678" }]);
		expect(result.stdout).toBe("Agent completed task");
	});

	it("supports custom agent type and model override", async () => {
		// Arrange
		const executedCmds: { cmd: readonly string[] }[] = [];
		const processRunner = async (cmd: readonly string[]) => {
			executedCmds.push({ cmd });
			if (cmd[0] === "git") {
				return {
					exitCode: 0,
					stderr: "",
					stdout: "111aaa feat: gemini commit",
				};
			}
			return { exitCode: 0, stderr: "", stdout: "" };
		};

		const runner = new DefaultAgentRunner({
			agent: "gemini",
			model: "gemini-2.5-pro",
			processRunner,
		});

		// Act
		const result = await runner.run({
			attempt: 1,
			branch: "feat/gemini",
			maxAttempts: 3,
			prompt: "Gemini task",
			worktreePath: "/tmp/worktrees/gemini",
		});

		// Assert
		expect(executedCmds[0].cmd).toEqual([
			"gemini",
			"-p",
			"Gemini task",
			"--model",
			"gemini-2.5-pro",
		]);
		expect(result.commits).toEqual([{ sha: "111aaa" }]);
	});

	it("throws error when agent process exits with non-zero exit code", async () => {
		// Arrange
		const processRunner = async () => ({
			exitCode: 1,
			stderr: "Agent authorization expired",
			stdout: "",
		});

		const runner = new DefaultAgentRunner({ processRunner });

		// Act
		const runPromise = runner.run({
			attempt: 1,
			branch: "feat/err",
			maxAttempts: 3,
			prompt: "Error task",
			worktreePath: "/tmp/worktrees/err",
		});

		// Assert
		await expect(runPromise).rejects.toThrow(
			"Agent 'agy' exited with code 1: Agent authorization expired",
		);
	});

	it("throws error with Unknown error fallback when stderr and stdout are empty", async () => {
		// Arrange
		const processRunner = async () => ({
			exitCode: 127,
			stderr: "",
			stdout: "",
		});

		const runner = new DefaultAgentRunner({ processRunner });

		// Act
		const runPromise = runner.run({
			attempt: 1,
			branch: "feat/err-empty",
			maxAttempts: 3,
			prompt: "Error task empty",
			worktreePath: "/tmp/worktrees/err",
		});

		// Assert
		await expect(runPromise).rejects.toThrow(
			"Agent 'agy' exited with code 127: Unknown error",
		);
	});

	it("uses default processRunner when processRunner option is omitted", async () => {
		// Arrange
		const runner = new DefaultAgentRunner();

		// Act
		const runPromise = runner.run({
			attempt: 1,
			branch: "feat/default-runner",
			maxAttempts: 3,
			prompt: "Default runner task",
			worktreePath: "/tmp/non-existent-dir-12345",
		});

		// Assert
		await expect(runPromise).rejects.toThrow();
	});

	it("throws error when agent execution produces 0 commits on the branch", async () => {
		// Arrange
		const processRunner = async (cmd: readonly string[]) => {
			if (cmd[0] === "git") {
				return { exitCode: 0, stderr: "", stdout: "" };
			}
			return {
				exitCode: 0,
				stderr: "",
				stdout: "I inspected the code but made no changes",
			};
		};

		const runner = new DefaultAgentRunner({ processRunner });

		// Act
		const runPromise = runner.run({
			attempt: 1,
			branch: "feat/no-commits",
			maxAttempts: 3,
			prompt: "Empty task",
			worktreePath: "/tmp/worktrees/empty",
		});

		// Assert
		await expect(runPromise).rejects.toThrow(
			"Agent 'agy' completed execution but created 0 commits on branch 'feat/no-commits'",
		);
	});

	it("throws error when AbortSignal is already aborted", async () => {
		// Arrange
		const runner = new DefaultAgentRunner();
		const controller = new AbortController();
		controller.abort();

		// Act
		const runPromise = runner.run({
			attempt: 1,
			branch: "feat/abort",
			maxAttempts: 3,
			prompt: "Abort task",
			signal: controller.signal,
		});

		// Assert
		await expect(runPromise).rejects.toThrow("Agent run aborted");
	});
});
