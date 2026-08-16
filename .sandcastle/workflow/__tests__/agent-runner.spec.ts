import { describe, expect, it } from "vitest";
import { MockAgentRunner } from "../agent-runner";

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
