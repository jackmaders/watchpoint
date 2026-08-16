import { describe, expect, it } from "vitest";
import { MockGithubClient } from "../../github/client";
import type { ProcessRunner } from "../../github/types";
import { MockRunnerLockManager, MockWorktreeManager } from "../../worktree";
import { MockAgentRunner } from "../agent-runner";
import { executeTicketWorkflow } from "../workflow";

describe("Workflow Orchestration Engine", () => {
	it("executes full successful workflow: lock -> claim -> worktree -> agent -> validate -> deliver PR -> cleanup", async () => {
		// Arrange
		const githubClient = new MockGithubClient([
			{
				assignees: [],
				body: "Build the feature",
				issueDependenciesSummary: { blockedBy: 0 },
				labels: ["ready-for-agent", "enhancement"],
				number: 165,
				title: "feat(workflow): execution lifecycle",
			},
		]);
		const lockManager = new MockRunnerLockManager();
		const worktreeManager = new MockWorktreeManager();
		const agentRunner = new MockAgentRunner();
		const stages: string[] = [];

		let gitPushCalled = false;
		const gitRunner: ProcessRunner = async (cmd) => {
			if (cmd[0] === "git" && cmd[1] === "push") {
				gitPushCalled = true;
			}
			return { exitCode: 0, stderr: "", stdout: "" };
		};

		const validator = async () => ({
			checks: [{ name: "check:all", output: "", success: true }],
			success: true,
		});

		// Act
		const result = await executeTicketWorkflow({
			agentRunner,
			githubClient,
			gitRunner,
			issueNumber: 165,
			lockManager,
			onProgress: (stage) => {
				stages.push(stage);
			},
			validator,
			worktreeManager,
		});

		const lockStatus = await lockManager.getLockStatus();
		const worktrees = await worktreeManager.listWorktrees();
		const prs = githubClient.getCreatedPullRequests();

		// Assert
		expect(result.success).toBe(true);
		expect(result.issueNumber).toBe(165);
		expect(result.branch).toContain("feat/issue-165-execution-lifecycle");
		expect(result.attempts).toBe(1);
		expect(result.prUrl).toBe("https://github.com/mock/repo/pull/1");
		expect(gitPushCalled).toBe(true);
		expect(prs).toHaveLength(1);
		expect(prs[0].labels).toEqual(["ready-for-human"]);
		expect(lockStatus.isLocked).toBe(false);
		expect(worktrees).toHaveLength(0);
		expect(stages).toEqual([
			"locking",
			"claiming",
			"worktree",
			"executing",
			"validating",
			"delivering",
			"cleanup",
		]);
	});

	it("executes self-healing retry loop when initial validation fails and succeeds on retry", async () => {
		// Arrange
		const githubClient = new MockGithubClient([
			{
				assignees: [],
				body: "Self healing issue",
				issueDependenciesSummary: { blockedBy: 0 },
				labels: ["ready-for-agent"],
				number: 166,
				title: "feat: self healing test",
			},
		]);
		const lockManager = new MockRunnerLockManager();
		const worktreeManager = new MockWorktreeManager();
		const agentRunner = new MockAgentRunner();

		let validationCount = 0;
		const validator = async () => {
			validationCount++;
			if (validationCount === 1) {
				return {
					aggregatedError: "TypeError: TS2322",
					checks: [{ name: "check:types", output: "TS2322", success: false }],
					success: false,
				};
			}
			return {
				checks: [{ name: "check:all", output: "", success: true }],
				success: true,
			};
		};

		const gitRunner: ProcessRunner = async () => ({
			exitCode: 0,
			stderr: "",
			stdout: "",
		});

		// Act
		const result = await executeTicketWorkflow({
			agentRunner,
			githubClient,
			gitRunner,
			issueNumber: 166,
			lockManager,
			validator,
			worktreeManager,
		});

		const runs = agentRunner.getRuns();

		// Assert
		expect(result.success).toBe(true);
		expect(result.attempts).toBe(2);
		expect(runs).toHaveLength(2);
		expect(runs[1].prompt).toContain("TS2322");
	});

	it("handles failure when max attempts are exhausted: pushes partial branch, updates labels, posts diagnostics, cleans up", async () => {
		// Arrange
		const githubClient = new MockGithubClient([
			{
				assignees: [],
				body: "Failing issue",
				issueDependenciesSummary: { blockedBy: 0 },
				labels: ["ready-for-agent", "enhancement"],
				number: 167,
				title: "fix: stubborn bug",
			},
		]);
		const lockManager = new MockRunnerLockManager();
		const worktreeManager = new MockWorktreeManager();
		const agentRunner = new MockAgentRunner();

		const validator = async () => ({
			aggregatedError: "Tests failed on attempt",
			checks: [{ name: "test:unit", output: "1 failed", success: false }],
			success: false,
		});

		const gitRunner: ProcessRunner = async () => ({
			exitCode: 0,
			stderr: "",
			stdout: "",
		});

		// Act
		const result = await executeTicketWorkflow({
			agentRunner,
			githubClient,
			gitRunner,
			issueNumber: 167,
			lockManager,
			maxAttempts: 2,
			validator,
			worktreeManager,
		});

		const updatedIssue = await githubClient.getIssue(167);
		const comments = githubClient.getComments(167);
		const lockStatus = await lockManager.getLockStatus();
		const worktrees = await worktreeManager.listWorktrees();

		// Assert
		expect(result.success).toBe(false);
		expect(result.attempts).toBe(2);
		expect(result.error).toContain(
			"Validation checks failed after 2 attempt(s)",
		);
		expect(updatedIssue.labels).toEqual(["enhancement", "ready-for-human"]);
		expect(updatedIssue.assignees).toEqual([]);
		expect(comments).toHaveLength(1);
		expect(comments[0]).toContain("❌ Execution Failure Diagnostic Report");
		expect(lockStatus.isLocked).toBe(false);
		expect(worktrees).toHaveLength(0);
	});

	it("handles early AbortSignal before workflow starts", async () => {
		// Arrange
		const controller = new AbortController();
		controller.abort();

		const githubClient = new MockGithubClient();
		const lockManager = new MockRunnerLockManager();
		const worktreeManager = new MockWorktreeManager();
		const agentRunner = new MockAgentRunner();

		// Act
		const result = await executeTicketWorkflow({
			agentRunner,
			githubClient,
			issueNumber: 168,
			lockManager,
			signal: controller.signal,
			worktreeManager,
		});

		// Assert
		expect(result.success).toBe(false);
		expect(result.aborted).toBe(true);
		expect(result.attempts).toBe(0);
	});

	it("handles cooperative cancellation via AbortSignal during execution: releases claim, preserves ready-for-agent label, cleans worktree and lock", async () => {
		// Arrange
		const controller = new AbortController();
		const githubClient = new MockGithubClient([
			{
				assignees: [],
				body: "Abortable task",
				issueDependenciesSummary: { blockedBy: 0 },
				labels: ["ready-for-agent"],
				number: 169,
				title: "feat: abortable",
			},
		]);
		const lockManager = new MockRunnerLockManager();
		const worktreeManager = new MockWorktreeManager();
		const agentRunner = new MockAgentRunner();

		const validator = async () => {
			controller.abort();
			return {
				aggregatedError: "Failed validation",
				checks: [{ name: "test", output: "", success: false }],
				success: false,
			};
		};

		// Act
		const result = await executeTicketWorkflow({
			agentRunner,
			githubClient,
			issueNumber: 169,
			lockManager,
			maxAttempts: 3,
			signal: controller.signal,
			validator,
			worktreeManager,
		});

		const issue = await githubClient.getIssue(169);
		const comments = githubClient.getComments(169);
		const lockStatus = await lockManager.getLockStatus();
		const worktrees = await worktreeManager.listWorktrees();

		// Assert
		expect(result.success).toBe(false);
		expect(result.aborted).toBe(true);
		expect(issue.labels).toEqual(["ready-for-agent"]);
		expect(issue.assignees).toEqual([]);
		expect(comments).toHaveLength(0);
		expect(lockStatus.isLocked).toBe(false);
		expect(worktrees).toHaveLength(0);
	});

	it("recovers and cleans up resources when worktree creation fails with an exception", async () => {
		// Arrange
		const githubClient = new MockGithubClient([
			{
				assignees: [],
				body: "Failing worktree",
				issueDependenciesSummary: { blockedBy: 0 },
				labels: ["ready-for-agent"],
				number: 171,
				title: "feat: broken worktree",
			},
		]);
		const lockManager = new MockRunnerLockManager();
		const worktreeManager = new MockWorktreeManager();
		worktreeManager.simulateCreateFailure("Disk space full");
		const agentRunner = new MockAgentRunner();

		// Act
		const result = await executeTicketWorkflow({
			agentRunner,
			githubClient,
			issueNumber: 171,
			lockManager,
			worktreeManager,
		});

		const lockStatus = await lockManager.getLockStatus();
		const issue = await githubClient.getIssue(171);

		// Assert
		expect(result.success).toBe(false);
		expect(result.error).toContain("Disk space full");
		expect(lockStatus.isLocked).toBe(false);
		expect(issue.labels).toEqual(["ready-for-human"]);
	});

	it("recovers and releases lock when lock acquisition fails", async () => {
		// Arrange
		const githubClient = new MockGithubClient([
			{
				assignees: [],
				body: "Lock failure issue",
				issueDependenciesSummary: { blockedBy: 0 },
				labels: ["ready-for-agent"],
				number: 172,
				title: "feat: lock failure",
			},
		]);
		const lockManager = new MockRunnerLockManager();
		await lockManager.acquireLock({ issueNumber: 999 });

		const worktreeManager = new MockWorktreeManager();
		const agentRunner = new MockAgentRunner();

		// Act
		const result = await executeTicketWorkflow({
			agentRunner,
			githubClient,
			issueNumber: 172,
			lockManager,
			worktreeManager,
		});

		// Assert
		expect(result.success).toBe(false);
		expect(result.error).toContain("Runner lock is already held");
	});

	it("handles custom branch override when passed in WorkflowOptions", async () => {
		// Arrange
		const githubClient = new MockGithubClient([
			{
				assignees: [],
				body: "Custom branch task",
				issueDependenciesSummary: { blockedBy: 0 },
				labels: ["ready-for-agent"],
				number: 173,
				title: "feat: custom branch",
			},
		]);
		const lockManager = new MockRunnerLockManager();
		const worktreeManager = new MockWorktreeManager();
		const agentRunner = new MockAgentRunner();

		const gitRunner: ProcessRunner = async () => ({
			exitCode: 0,
			stderr: "",
			stdout: "",
		});

		const validator = async () => ({
			checks: [{ name: "check", output: "", success: true }],
			success: true,
		});

		// Act
		const result = await executeTicketWorkflow({
			agentRunner,
			branch: "feat/my-custom-branch",
			githubClient,
			gitRunner,
			issueNumber: 173,
			lockManager,
			validator,
			worktreeManager,
		});

		// Assert
		expect(result.success).toBe(true);
		expect(result.branch).toBe("feat/my-custom-branch");
	});

	it("uses default components when optional dependencies are omitted in WorkflowOptions", async () => {
		// Arrange
		const agentRunner = new MockAgentRunner();
		const controller = new AbortController();
		controller.abort();

		// Act
		const result = await executeTicketWorkflow({
			agentRunner,
			issueNumber: 174,
			signal: controller.signal,
		});

		// Assert
		expect(result.success).toBe(false);
		expect(result.aborted).toBe(true);
	});

	it("uses default components when optional dependencies are omitted in WorkflowOptions and executes to error", async () => {
		// Arrange
		const agentRunner = new MockAgentRunner();

		// Act
		const result = await executeTicketWorkflow({
			agentRunner,
			issueNumber: 9999,
		});

		// Assert
		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});

	it("executes defaultValidator when validator is omitted", async () => {
		// Arrange
		const githubClient = new MockGithubClient([
			{
				assignees: [],
				body: "Task for default validator",
				issueDependenciesSummary: { blockedBy: 0 },
				labels: ["ready-for-agent"],
				number: 175,
				title: "feat: default validator test",
			},
		]);
		const lockManager = new MockRunnerLockManager();
		const worktreeManager = new MockWorktreeManager();
		const agentRunner = new MockAgentRunner();

		const gitRunner: ProcessRunner = async (_cmd) => {
			return { exitCode: 0, stderr: "", stdout: "All checks passed" };
		};

		// Act
		const result = await executeTicketWorkflow({
			agentRunner,
			githubClient,
			gitRunner,
			issueNumber: 175,
			lockManager,
			worktreeManager,
		});

		// Assert
		expect(result.success).toBe(true);
		expect(result.attempts).toBe(1);
	});

	it("handles abort after lock is acquired but before claiming", async () => {
		// Arrange
		const controller = new AbortController();
		const githubClient = new MockGithubClient([
			{
				assignees: [],
				body: "Abort post lock",
				issueDependenciesSummary: { blockedBy: 0 },
				labels: ["ready-for-agent"],
				number: 176,
				title: "feat: abort post lock",
			},
		]);
		const lockManager = new MockRunnerLockManager();
		const worktreeManager = new MockWorktreeManager();
		const agentRunner = new MockAgentRunner();

		// Spy lock acquisition to abort immediately after lock
		const originalAcquire = lockManager.acquireLock.bind(lockManager);
		lockManager.acquireLock = async (opts) => {
			const res = await originalAcquire(opts);
			controller.abort();
			return res;
		};

		// Act
		const result = await executeTicketWorkflow({
			agentRunner,
			githubClient,
			issueNumber: 176,
			lockManager,
			signal: controller.signal,
			worktreeManager,
		});

		const lockStatus = await lockManager.getLockStatus();

		// Assert
		expect(result.success).toBe(false);
		expect(result.aborted).toBe(true);
		expect(result.error).toBe("Workflow aborted before claiming");
		expect(lockStatus.isLocked).toBe(false);
	});

	it("handles abort after claim is acquired before worktree creation", async () => {
		// Arrange
		const controller = new AbortController();
		const githubClient = new MockGithubClient([
			{
				assignees: [],
				body: "Abort post claim",
				issueDependenciesSummary: { blockedBy: 0 },
				labels: ["ready-for-agent"],
				number: 177,
				title: "feat: abort post claim",
			},
		]);
		const lockManager = new MockRunnerLockManager();
		const worktreeManager = new MockWorktreeManager();
		const agentRunner = new MockAgentRunner();

		// Spy claimIssue to abort immediately after claim
		const originalClaim = githubClient.claimIssue.bind(githubClient);
		githubClient.claimIssue = async (num, expected) => {
			const res = await originalClaim(num, expected);
			controller.abort();
			return res;
		};

		// Act
		const result = await executeTicketWorkflow({
			agentRunner,
			githubClient,
			issueNumber: 177,
			lockManager,
			signal: controller.signal,
			worktreeManager,
		});

		const issue = await githubClient.getIssue(177);
		const lockStatus = await lockManager.getLockStatus();

		// Assert
		expect(result.success).toBe(false);
		expect(result.aborted).toBe(true);
		expect(result.error).toBe("Workflow aborted after claiming");
		expect(issue.assignees).toEqual([]);
		expect(lockStatus.isLocked).toBe(false);
	});

	it("handles abort during agent execution when signal aborts right after agent run", async () => {
		// Arrange
		const controller = new AbortController();
		const githubClient = new MockGithubClient([
			{
				assignees: [],
				body: "Abort post agent run",
				issueDependenciesSummary: { blockedBy: 0 },
				labels: ["ready-for-agent"],
				number: 178,
				title: "feat: abort post agent",
			},
		]);
		const lockManager = new MockRunnerLockManager();
		const worktreeManager = new MockWorktreeManager();
		const agentRunner = new MockAgentRunner();

		const originalRun = agentRunner.run.bind(agentRunner);
		agentRunner.run = async (opts) => {
			const res = await originalRun(opts);
			controller.abort();
			return res;
		};

		// Act
		const result = await executeTicketWorkflow({
			agentRunner,
			githubClient,
			issueNumber: 178,
			lockManager,
			signal: controller.signal,
			worktreeManager,
		});

		const issue = await githubClient.getIssue(178);

		// Assert
		expect(result.success).toBe(false);
		expect(result.aborted).toBe(true);
		expect(issue.assignees).toEqual([]);
	});

	it("handles error when agent throws an exception while signal is aborted", async () => {
		// Arrange
		const controller = new AbortController();
		const githubClient = new MockGithubClient([
			{
				assignees: [],
				body: "Agent throw on abort",
				issueDependenciesSummary: { blockedBy: 0 },
				labels: ["ready-for-agent"],
				number: 179,
				title: "feat: agent abort error",
			},
		]);
		const lockManager = new MockRunnerLockManager();
		const worktreeManager = new MockWorktreeManager();
		const agentRunner = new MockAgentRunner();

		agentRunner.run = async () => {
			controller.abort();
			throw new Error("Agent operation aborted");
		};

		// Act
		const result = await executeTicketWorkflow({
			agentRunner,
			githubClient,
			issueNumber: 179,
			lockManager,
			signal: controller.signal,
			worktreeManager,
		});

		const issue = await githubClient.getIssue(179);

		// Assert
		expect(result.success).toBe(false);
		expect(result.aborted).toBe(true);
		expect(issue.assignees).toEqual([]);
	});

	it("handles error in releaseClaim during abort without throwing unhandled error", async () => {
		// Arrange
		const controller = new AbortController();
		const githubClient = new MockGithubClient([
			{
				assignees: [],
				body: "Release error on abort",
				issueDependenciesSummary: { blockedBy: 0 },
				labels: ["ready-for-agent"],
				number: 181,
				title: "feat: release error",
			},
		]);
		const lockManager = new MockRunnerLockManager();
		const worktreeManager = new MockWorktreeManager();
		const agentRunner = new MockAgentRunner();

		agentRunner.run = async () => {
			controller.abort();
			githubClient.releaseClaim = async () => {
				throw new Error("Simulated release failure");
			};
			throw new Error("Sandbox interrupted");
		};

		// Act
		const result = await executeTicketWorkflow({
			agentRunner,
			githubClient,
			issueNumber: 181,
			lockManager,
			signal: controller.signal,
			worktreeManager,
		});

		// Assert
		expect(result.success).toBe(false);
		expect(result.aborted).toBe(true);
	});

	it("resiliently handles cleanup failures in worktree and lock teardown during finally", async () => {
		// Arrange
		const githubClient = new MockGithubClient([
			{
				assignees: [],
				body: "Finally failure issue",
				issueDependenciesSummary: { blockedBy: 0 },
				labels: ["ready-for-agent"],
				number: 182,
				title: "feat: cleanup failure",
			},
		]);
		const lockManager = new MockRunnerLockManager();
		lockManager.releaseLock = async () => {
			throw new Error("Lock release disk IO error");
		};

		const worktreeManager = new MockWorktreeManager();
		worktreeManager.simulateCleanupFailure("Worktree removal failure");
		const agentRunner = new MockAgentRunner();

		const validator = async () => ({
			checks: [{ name: "test", output: "", success: true }],
			success: true,
		});

		const gitRunner: ProcessRunner = async () => ({
			exitCode: 0,
			stderr: "",
			stdout: "",
		});

		// Act
		const result = await executeTicketWorkflow({
			agentRunner,
			githubClient,
			gitRunner,
			issueNumber: 182,
			lockManager,
			validator,
			worktreeManager,
		});

		// Assert
		expect(result.success).toBe(true);
	});

	it("triggers failure recovery when an unexpected runtime error is thrown during agent execution", async () => {
		// Arrange
		const githubClient = new MockGithubClient([
			{
				assignees: [],
				body: "Unexpected error issue",
				issueDependenciesSummary: { blockedBy: 0 },
				labels: ["ready-for-agent"],
				number: 183,
				title: "feat: unhandled crash",
			},
		]);
		const lockManager = new MockRunnerLockManager();
		const worktreeManager = new MockWorktreeManager();
		const agentRunner = new MockAgentRunner();
		agentRunner.simulateFailure("Unexpected Docker runtime crash");

		// Act
		const result = await executeTicketWorkflow({
			agentRunner,
			githubClient,
			issueNumber: 183,
			lockManager,
			worktreeManager,
		});

		const issue = await githubClient.getIssue(183);
		const comments = githubClient.getComments(183);

		// Assert
		expect(result.success).toBe(false);
		expect(result.error).toBe("Unexpected Docker runtime crash");
		expect(issue.labels).toEqual(["ready-for-human"]);
		expect(comments).toHaveLength(1);
		expect(comments[0]).toContain("Unexpected Docker runtime crash");
	});

	it("handles non-Error thrown objects during workflow execution", async () => {
		// Arrange
		const githubClient = new MockGithubClient([
			{
				assignees: [],
				body: "String error issue",
				issueDependenciesSummary: { blockedBy: 0 },
				labels: ["ready-for-agent"],
				number: 184,
				title: "feat: string error",
			},
		]);
		const lockManager = new MockRunnerLockManager();
		const worktreeManager = new MockWorktreeManager();
		const agentRunner = new MockAgentRunner();

		agentRunner.run = async () => {
			throw "Plain string error thrown";
		};

		// Act
		const result = await executeTicketWorkflow({
			agentRunner,
			githubClient,
			issueNumber: 184,
			lockManager,
			worktreeManager,
		});

		// Assert
		expect(result.success).toBe(false);
		expect(result.error).toBe("Plain string error thrown");
	});

	it("handles exception during abort before issue is claimed without calling releaseClaim", async () => {
		// Arrange
		const controller = new AbortController();
		const githubClient = new MockGithubClient([
			{
				assignees: [],
				body: "Abort pre-claim error",
				issueDependenciesSummary: { blockedBy: 0 },
				labels: ["ready-for-agent"],
				number: 185,
				title: "feat: pre claim error",
			},
		]);
		const lockManager = new MockRunnerLockManager();
		lockManager.acquireLock = async () => {
			controller.abort();
			throw new Error("Lock IO error during abort");
		};
		const worktreeManager = new MockWorktreeManager();
		const agentRunner = new MockAgentRunner();

		// Act
		const result = await executeTicketWorkflow({
			agentRunner,
			githubClient,
			issueNumber: 185,
			lockManager,
			signal: controller.signal,
			worktreeManager,
		});

		// Assert
		expect(result.success).toBe(false);
		expect(result.aborted).toBe(true);
	});

	it("passes lastValidationOutput to failure handler when exception occurs on retry iteration", async () => {
		// Arrange
		const githubClient = new MockGithubClient([
			{
				assignees: [],
				body: "Retry crash issue",
				issueDependenciesSummary: { blockedBy: 0 },
				labels: ["ready-for-agent"],
				number: 186,
				title: "feat: retry crash",
			},
		]);
		const lockManager = new MockRunnerLockManager();
		const worktreeManager = new MockWorktreeManager();
		const agentRunner = new MockAgentRunner();

		let callCount = 0;
		const validator = async () => {
			callCount++;
			if (callCount === 1) {
				return {
					aggregatedError: "Failed checks on attempt 1",
					checks: [{ name: "check", output: "check fail", success: false }],
					success: false,
				};
			}
			return { checks: [], success: true };
		};

		agentRunner.run = async (opts) => {
			if (opts.attempt === 2) {
				throw new Error("Crash during attempt 2");
			}
			return { commits: [] };
		};

		// Act
		const result = await executeTicketWorkflow({
			agentRunner,
			githubClient,
			issueNumber: 186,
			lockManager,
			maxAttempts: 3,
			validator,
			worktreeManager,
		});

		const comments = githubClient.getComments(186);

		// Assert
		expect(result.success).toBe(false);
		expect(comments).toHaveLength(1);
		expect(comments[0]).toContain("Failed checks on attempt 1");
	});

	it("uses check output fallback when aggregatedError is absent", async () => {
		// Arrange
		const githubClient = new MockGithubClient([
			{
				assignees: [],
				body: "Check output fallback task",
				issueDependenciesSummary: { blockedBy: 0 },
				labels: ["ready-for-agent"],
				number: 187,
				title: "feat: check output fallback",
			},
		]);
		const lockManager = new MockRunnerLockManager();
		const worktreeManager = new MockWorktreeManager();
		const agentRunner = new MockAgentRunner();

		const validator = async () => ({
			checks: [
				{ name: "lint", output: "Lint error on line 5", success: false },
			],
			success: false,
		});

		// Act
		const result = await executeTicketWorkflow({
			agentRunner,
			githubClient,
			issueNumber: 187,
			lockManager,
			maxAttempts: 1,
			validator,
			worktreeManager,
		});

		const comments = githubClient.getComments(187);

		// Assert
		expect(result.success).toBe(false);
		expect(comments[0]).toContain("Lint error on line 5");
	});

	it("uses default 'Validation checks failed' fallback when aggregatedError and checks output are absent", async () => {
		// Arrange
		const githubClient = new MockGithubClient([
			{
				assignees: [],
				body: "Empty check output task",
				issueDependenciesSummary: { blockedBy: 0 },
				labels: ["ready-for-agent"],
				number: 188,
				title: "feat: empty check fallback",
			},
		]);
		const lockManager = new MockRunnerLockManager();
		const worktreeManager = new MockWorktreeManager();
		const agentRunner = new MockAgentRunner();

		const validator = async () => ({
			checks: [{ name: "check", output: "", success: false }],
			success: false,
		});

		// Act
		const result = await executeTicketWorkflow({
			agentRunner,
			githubClient,
			issueNumber: 188,
			lockManager,
			maxAttempts: 1,
			validator,
			worktreeManager,
		});

		const comments = githubClient.getComments(188);

		// Assert
		expect(result.success).toBe(false);
		expect(comments[0]).toContain("Validation checks failed");
	});

	it("uses err.message when err.stack is undefined on uncaught error", async () => {
		// Arrange
		const githubClient = new MockGithubClient([
			{
				assignees: [],
				body: "No stack error task",
				issueDependenciesSummary: { blockedBy: 0 },
				labels: ["ready-for-agent"],
				number: 189,
				title: "feat: no stack error",
			},
		]);
		const lockManager = new MockRunnerLockManager();
		const worktreeManager = new MockWorktreeManager();
		const agentRunner = new MockAgentRunner();

		const customError = new Error("Custom error without stack trace");
		Object.defineProperty(customError, "stack", { value: undefined });

		agentRunner.run = async () => {
			throw customError;
		};

		// Act
		const result = await executeTicketWorkflow({
			agentRunner,
			githubClient,
			issueNumber: 189,
			lockManager,
			worktreeManager,
		});

		const comments = githubClient.getComments(189);

		// Assert
		expect(result.success).toBe(false);
		expect(comments[0]).toContain("Custom error without stack trace");
	});

	it("skips PR delivery when localOnly is true", async () => {
		// Arrange
		const githubClient = new MockGithubClient([
			{
				assignees: [],
				body: "Local only issue",
				issueDependenciesSummary: { blockedBy: 0 },
				labels: ["ready-for-agent"],
				number: 190,
				title: "feat: local only execution",
			},
		]);
		const lockManager = new MockRunnerLockManager();
		const worktreeManager = new MockWorktreeManager();
		const agentRunner = new MockAgentRunner();
		const validator = async () => ({
			checks: [{ name: "check:all", output: "", success: true }],
			success: true,
		});

		// Act
		const result = await executeTicketWorkflow({
			agentRunner,
			githubClient,
			issueNumber: 190,
			localOnly: true,
			lockManager,
			validator,
			worktreeManager,
		});

		// Assert
		expect(result.success).toBe(true);
		expect(result.prUrl).toBeUndefined();
		expect(githubClient.getCreatedPullRequests()).toHaveLength(0);
	});

	it("skips PR delivery when pr is false", async () => {
		// Arrange
		const githubClient = new MockGithubClient([
			{
				assignees: [],
				body: "No PR issue",
				issueDependenciesSummary: { blockedBy: 0 },
				labels: ["ready-for-agent"],
				number: 191,
				title: "feat: no pr execution",
			},
		]);
		const lockManager = new MockRunnerLockManager();
		const worktreeManager = new MockWorktreeManager();
		const agentRunner = new MockAgentRunner();
		const validator = async () => ({
			checks: [{ name: "check:all", output: "", success: true }],
			success: true,
		});

		// Act
		const result = await executeTicketWorkflow({
			agentRunner,
			githubClient,
			issueNumber: 191,
			lockManager,
			pr: false,
			validator,
			worktreeManager,
		});

		// Assert
		expect(result.success).toBe(true);
		expect(result.prUrl).toBeUndefined();
		expect(githubClient.getCreatedPullRequests()).toHaveLength(0);
	});
});
