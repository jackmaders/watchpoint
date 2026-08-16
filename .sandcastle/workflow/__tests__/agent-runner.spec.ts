import { describe, expect, it } from "vitest";
import {
	buildDockerRunCommand,
	DefaultAgentRunner,
	MockAgentRunner,
} from "../agent-runner";

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

describe("buildDockerRunCommand", () => {
	it("constructs full docker run command with mounts, env vars, and worktree bindings", () => {
		// Arrange
		const authMounts = {
			env: {
				AGY_NON_INTERACTIVE: "1",
				GEMINI_API_KEY: "test-key",
			},
			mounts: [
				{
					hostPath: "/home/test/.gemini",
					readonly: false,
					sandboxPath: "/home/agent/.gemini",
				},
				{
					hostPath: "/home/test/.local/bin/agy",
					readonly: true,
					sandboxPath: "/home/agent/.local/bin/agy",
				},
			],
		};

		// Act
		const result = buildDockerRunCommand({
			agentCmd: [
				"agy",
				"-p",
				"Build feature",
				"--dangerously-skip-permissions",
			],
			authMounts,
			imageName: "sandcastle:custom-image",
			worktreePath: "/tmp/worktrees/feat-1",
		});

		// Assert
		expect(result).toEqual([
			"docker",
			"run",
			"--rm",
			"-i",
			"-v",
			"/tmp/worktrees/feat-1:/workspace",
			"-w",
			"/workspace",
			"-v",
			"/home/test/.gemini:/home/agent/.gemini",
			"-v",
			"/home/test/.local/bin/agy:/home/agent/.local/bin/agy:ro",
			"-e",
			"AGY_NON_INTERACTIVE=1",
			"-e",
			"GEMINI_API_KEY=test-key",
			"sandcastle:custom-image",
			"agy",
			"-p",
			"Build feature",
			"--dangerously-skip-permissions",
		]);
	});
});

describe("DefaultAgentRunner", () => {
	it("executes default agy agent inside docker sandbox with dangerously-skip-permissions by default", async () => {
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

		const authMountsConfig = {
			env: {
				AGY_NON_INTERACTIVE: "1",
			},
			mounts: [
				{
					hostPath: "/home/test/.gemini",
					readonly: false,
					sandboxPath: "/home/agent/.gemini",
				},
			],
		};

		const runner = new DefaultAgentRunner({
			authMountsConfig,
			imageName: "sandcastle:watchpoint",
			processRunner,
			sandbox: "docker",
		});

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
		expect(executedCmds[0].cmd).toEqual([
			"docker",
			"run",
			"--rm",
			"-i",
			"-v",
			"/tmp/worktrees/feat-1:/workspace",
			"-w",
			"/workspace",
			"-v",
			"/home/test/.gemini:/home/agent/.gemini",
			"-e",
			"AGY_NON_INTERACTIVE=1",
			"sandcastle:watchpoint",
			"agy",
			"-p",
			"Build feature 1",
			"--dangerously-skip-permissions",
		]);
		expect(executedCmds[0].cwd).toBe("/tmp/worktrees/feat-1");
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

	it("uses resolveAuthMounts when authMountsConfig is not provided and handles undefined worktreePath", async () => {
		// Arrange
		const executedCmds: { cmd: readonly string[] }[] = [];
		const processRunner = async (cmd: readonly string[]) => {
			executedCmds.push({ cmd });
			if (cmd[0] === "git") {
				return {
					exitCode: 0,
					stderr: "",
					stdout: "1234567 feat: default mount test",
				};
			}
			return { exitCode: 0, stderr: "", stdout: "" };
		};

		const runner = new DefaultAgentRunner({
			homeDir: "/tmp/non-existent-home-dir-9999",
			processRunner,
			sandbox: "docker",
		});

		// Act
		const result = await runner.run({
			attempt: 1,
			branch: "feat/default-mount",
			maxAttempts: 3,
			prompt: "Default mount task",
		});

		// Assert
		expect(executedCmds[0].cmd).toContain("docker");
		expect(executedCmds[0].cmd).toContain(":/workspace");
		expect(result.commits).toEqual([{ sha: "1234567" }]);
	});

	it("supports direct host execution when sandbox is set to none", async () => {
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
			if (cmd[0] === "git") {
				return {
					exitCode: 0,
					stderr: "",
					stdout: "111aaa feat: direct host commit",
				};
			}
			return { exitCode: 0, stderr: "", stdout: "Host agent ran" };
		};

		const runner = new DefaultAgentRunner({
			agent: "agy",
			dangerouslySkipPermissions: false,
			processRunner,
			sandbox: "none",
		});

		// Act
		const result = await runner.run({
			attempt: 1,
			branch: "feat/host-run",
			maxAttempts: 3,
			prompt: "Direct task",
			worktreePath: "/tmp/worktrees/host-run",
		});

		// Assert
		expect(executedCmds[0].cmd).toEqual(["agy", "-p", "Direct task"]);
		expect(executedCmds[0].cwd).toBe("/tmp/worktrees/host-run");
		expect(executedCmds[0].env?.AGY_NON_INTERACTIVE).toBe("1");
		expect(result.commits).toEqual([{ sha: "111aaa" }]);
	});

	it("supports custom agent type (claude, codex, gemini) and model override", async () => {
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

		const runnerGemini = new DefaultAgentRunner({
			agent: "gemini",
			model: "gemini-2.5-pro",
			processRunner,
			sandbox: "none",
		});

		const runnerCodex = new DefaultAgentRunner({
			agent: "codex",
			dangerouslySkipPermissions: true,
			model: "o3-mini",
			processRunner,
			sandbox: "none",
		});

		const runnerClaude = new DefaultAgentRunner({
			agent: "claude",
			dangerouslySkipPermissions: true,
			model: "claude-sonnet-4-6",
			processRunner,
			sandbox: "none",
		});

		const runnerCodexNoModel = new DefaultAgentRunner({
			agent: "codex",
			dangerouslySkipPermissions: false,
			processRunner,
			sandbox: "none",
		});

		// Act
		await runnerGemini.run({
			attempt: 1,
			branch: "feat/gemini",
			maxAttempts: 3,
			prompt: "Gemini task",
			worktreePath: "/tmp/worktrees/gemini",
		});

		await runnerCodex.run({
			attempt: 1,
			branch: "feat/codex",
			maxAttempts: 3,
			prompt: "Codex task",
			worktreePath: "/tmp/worktrees/codex",
		});

		await runnerClaude.run({
			attempt: 1,
			branch: "feat/claude",
			maxAttempts: 3,
			prompt: "Claude task",
			worktreePath: "/tmp/worktrees/claude",
		});

		await runnerCodexNoModel.run({
			attempt: 1,
			branch: "feat/codex-no-model",
			maxAttempts: 3,
			prompt: "Codex no model task",
			worktreePath: "/tmp/worktrees/codex-no-model",
		});

		// Assert
		expect(executedCmds[0].cmd).toEqual([
			"gemini",
			"-p",
			"Gemini task",
			"--model",
			"gemini-2.5-pro",
		]);
		expect(executedCmds[2].cmd).toEqual([
			"codex",
			"exec",
			"Codex task",
			"--model",
			"o3-mini",
			"--dangerously-bypass-approvals-and-sandbox",
		]);
		expect(executedCmds[4].cmd).toEqual([
			"claude",
			"-p",
			"Claude task",
			"--model",
			"claude-sonnet-4-6",
			"--dangerously-skip-permissions",
		]);
		expect(executedCmds[6].cmd).toEqual([
			"codex",
			"exec",
			"Codex no model task",
		]);
	});

	it("throws error when agent process exits with non-zero exit code", async () => {
		// Arrange
		const processRunner = async () => ({
			exitCode: 1,
			stderr: "Agent authorization expired",
			stdout: "",
		});

		const runner = new DefaultAgentRunner({
			processRunner,
			sandbox: "none",
		});

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

		const runner = new DefaultAgentRunner({
			processRunner,
			sandbox: "none",
		});

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
		const runner = new DefaultAgentRunner({ sandbox: "none" });

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

		const runner = new DefaultAgentRunner({
			processRunner,
			sandbox: "none",
		});

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
		const runner = new DefaultAgentRunner({ sandbox: "none" });
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
