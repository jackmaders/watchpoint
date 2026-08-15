import { describe, expect, it, vi } from "vitest";
import { orchestrateSandcastle } from "../orchestrator";
import type { SandcastleCliArgs } from "../types";

describe("orchestrateSandcastle", () => {
	it("executes dry-run without invoking sandbox or git push", async () => {
		// Arrange
		const args: SandcastleCliArgs = {
			agent: "agy",
			dryRun: true,
			localOnly: false,
			maxRetries: 3,
			pr: true,
			prompt: "Add dummy feature",
		};
		const runAgentInSandbox = vi.fn();
		const createPr = vi.fn();
		const logger = vi.fn();

		// Act
		const result = await orchestrateSandcastle(
			{ args },
			{ createPr, logger, runAgentInSandbox },
		);

		// Assert
		expect(result.success).toBe(true);
		expect(result.branch).toBe("feat/add-dummy-feature");
		expect(runAgentInSandbox).not.toHaveBeenCalled();
		expect(createPr).not.toHaveBeenCalled();
		expect(logger).toHaveBeenCalled();
	});

	it("handles fallback empty prompt when prompt is undefined", async () => {
		// Arrange
		const args: SandcastleCliArgs = {
			agent: "agy",
			dryRun: true,
			localOnly: true,
			maxRetries: 1,
			pr: false,
		};

		// Act
		const result = await orchestrateSandcastle({ args });

		// Assert
		expect(result.success).toBe(true);
		expect(result.branch.startsWith("feat/agent-task-")).toBe(true);
	});

	it("executes dry-run with default dependencies and no options", async () => {
		// Arrange
		const args: SandcastleCliArgs = {
			agent: "agy",
			dryRun: true,
			localOnly: false,
			maxRetries: 3,
			pr: true,
			prompt: "Add dummy feature without deps",
		};

		// Act
		const result = await orchestrateSandcastle({ args });

		// Assert
		expect(result.success).toBe(true);
		expect(result.branch).toBe("feat/add-dummy-feature-without-deps");
	});

	it("fetches issue, runs agent, verifies, and creates draft PR", async () => {
		// Arrange
		const args: SandcastleCliArgs = {
			agent: "agy",
			dryRun: false,
			issue: 152,
			localOnly: false,
			maxRetries: 3,
			pr: true,
		};
		const issue = {
			body: "Full issue specification here",
			number: 152,
			title:
				"feat(sandbox): 🏰 orchestrate autonomous coding agents with Sandcastle",
		};
		const fetchIssue = vi.fn().mockResolvedValue(issue);
		const runAgentInSandbox = vi.fn().mockResolvedValue({
			commits: [{ sha: "abcdef123456" }],
			stdout: "Agent completed task",
		});
		const runCommand = vi.fn().mockResolvedValue({
			exitCode: 0,
			stderr: "",
			stdout: "Verification OK",
		});
		const createPr = vi.fn().mockResolvedValue({
			prUrl: "https://github.com/jackmaders/watchpoint/pull/153",
		});

		// Act
		const result = await orchestrateSandcastle(
			{ args },
			{
				createPr,
				fetchIssue,
				runAgentInSandbox,
				runCommand,
			},
		);

		// Assert
		expect(result.success).toBe(true);
		expect(result.attempts).toBe(1);
		expect(result.prUrl).toBe(
			"https://github.com/jackmaders/watchpoint/pull/153",
		);
		expect(fetchIssue).toHaveBeenCalledWith(152);
		expect(runAgentInSandbox).toHaveBeenCalledTimes(1);
		expect(createPr).toHaveBeenCalledTimes(1);
	});

	it("honors local-only flag and does not create PR", async () => {
		// Arrange
		const args: SandcastleCliArgs = {
			agent: "gemini",
			dryRun: false,
			localOnly: true,
			maxRetries: 3,
			pr: false,
			prompt: "Refactor audio sync",
		};
		const runAgentInSandbox = vi.fn().mockResolvedValue({
			commits: [{ sha: "1122334455" }],
			stdout: "Completed",
		});
		const runCommand = vi.fn().mockResolvedValue({
			exitCode: 0,
			stderr: "",
			stdout: "Verification OK",
		});
		const createPr = vi.fn();

		// Act
		const result = await orchestrateSandcastle(
			{ args },
			{
				createPr,
				runAgentInSandbox,
				runCommand,
			},
		);

		// Assert
		expect(result.success).toBe(true);
		expect(result.prUrl).toBeUndefined();
		expect(createPr).not.toHaveBeenCalled();
	});

	it("runs self-healing retry loop when initial checks fail", async () => {
		// Arrange
		const args: SandcastleCliArgs = {
			agent: "agy",
			dryRun: false,
			localOnly: false,
			maxRetries: 3,
			pr: true,
			prompt: "Fix button styling",
		};
		const runAgentInSandbox = vi.fn().mockResolvedValue({
			commits: [{ sha: "998877" }],
			stdout: "Run output",
		});
		let callCount = 0;
		const runCommand = vi.fn().mockImplementation(async (_cmd: string) => {
			callCount++;
			if (callCount === 1) {
				// First check fails
				return { exitCode: 1, stderr: "Lint error on button.tsx", stdout: "" };
			}
			// Subsequent checks pass
			return { exitCode: 0, stderr: "", stdout: "Passed" };
		});
		const createPr = vi.fn().mockResolvedValue({
			prUrl: "https://github.com/jackmaders/watchpoint/pull/154",
		});

		// Act
		const result = await orchestrateSandcastle(
			{ args },
			{
				createPr,
				runAgentInSandbox,
				runCommand,
			},
		);

		// Assert
		expect(result.success).toBe(true);
		expect(result.attempts).toBe(2);
		expect(runAgentInSandbox).toHaveBeenCalledTimes(2);
	});

	it("returns failure result when max retries are exhausted", async () => {
		// Arrange
		const args: SandcastleCliArgs = {
			agent: "agy",
			dryRun: false,
			localOnly: false,
			maxRetries: 2,
			pr: true,
			prompt: "Complex refactor",
		};
		const runAgentInSandbox = vi.fn().mockResolvedValue({
			commits: [],
			stdout: "Fail",
		});
		const runCommand = vi.fn().mockResolvedValue({
			exitCode: 1,
			stderr: "Compilation failed",
			stdout: "",
		});
		const createPr = vi.fn();

		// Act
		const result = await orchestrateSandcastle(
			{ args },
			{
				createPr,
				runAgentInSandbox,
				runCommand,
			},
		);

		// Assert
		expect(result.success).toBe(false);
		expect(result.attempts).toBe(2);
		expect(result.error).toContain("Compilation failed");
		expect(createPr).not.toHaveBeenCalled();
	});
});
