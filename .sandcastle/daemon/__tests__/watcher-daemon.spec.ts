import { describe, expect, it } from "vitest";
import { MockGithubClient } from "../../github/client";
import { IssueAlreadyClaimedError } from "../../github/errors";
import type { CandidateIssue } from "../../github/types";
import { MockAgentRunner } from "../../workflow/agent-runner";
import type { ExecutionResult, WorkflowOptions } from "../../workflow/types";
import { MockRunnerLockManager, MockWorktreeManager } from "../../worktree";
import { MockWatcherClock } from "../__mocks__/watcher-clock";
import {
	defaultDaemonLogger,
	isClaimContention,
	runWatcherDaemon,
	WatcherDaemon,
} from "../watcher-daemon";

function makeIssue(
	num: number,
	title: string,
	options: {
		blockedBy?: number;
		assignees?: string[];
		labels?: string[];
		createdAt?: string;
	} = {},
): CandidateIssue {
	return {
		assignees: options.assignees ?? [],
		body: `Description for #${num}`,
		createdAt: options.createdAt ?? "2026-08-16T08:00:00Z",
		issueDependenciesSummary: {
			blockedBy: options.blockedBy ?? 0,
		},
		labels: options.labels ?? ["ready-for-agent"],
		number: num,
		title,
		url: `https://github.com/test/repo/issues/${num}`,
	};
}

describe("isClaimContention", () => {
	it("identifies IssueAlreadyClaimedError instance", () => {
		// Arrange
		const err = new IssueAlreadyClaimedError(101, ["@someone"]);

		// Act
		const result = isClaimContention(err);

		// Assert
		expect(result).toBe(true);
	});

	it("identifies string containing 'already claimed'", () => {
		// Arrange
		const err = "Issue is already claimed by someone else";

		// Act
		const result = isClaimContention(err);

		// Assert
		expect(result).toBe(true);
	});

	it("identifies Error with message containing 'already claimed'", () => {
		// Arrange
		const err = new Error("Task was already claimed");

		// Act
		const result = isClaimContention(err);

		// Assert
		expect(result).toBe(true);
	});

	it("returns false for unrelated errors or numbers", () => {
		// Arrange
		const err = new Error("Network timeout");

		// Act
		const result1 = isClaimContention(err);
		const result2 = isClaimContention(404);

		// Assert
		expect(result1).toBe(false);
		expect(result2).toBe(false);
	});
});

describe("defaultDaemonLogger", () => {
	it("writes to console.log", () => {
		// Arrange
		let logged = "";
		const originalLog = console.log;
		console.log = (msg: string) => {
			logged = msg;
		};

		// Act
		try {
			defaultDaemonLogger("test daemon log");
		} finally {
			console.log = originalLog;
		}

		// Assert
		expect(logged).toBe("test daemon log");
	});
});

describe("WatcherDaemon", () => {
	it("returns aborted stats immediately if signal is already aborted", async () => {
		// Arrange
		const controller = new AbortController();
		controller.abort();
		const clock = new MockWatcherClock();
		const githubClient = new MockGithubClient();
		const daemon = new WatcherDaemon({
			clock,
			githubClient,
			signal: controller.signal,
		});

		// Act
		const stats = await daemon.run();

		// Assert
		expect(stats).toEqual({
			aborted: true,
			failureCount: 0,
			processedCount: 0,
			successCount: 0,
		});
	});

	it("executes single ticket with --once and processes in strict FIFO order", async () => {
		// Arrange
		const clock = new MockWatcherClock();
		const logs: string[] = [];
		const logger = (msg: string) => logs.push(msg);
		const issue1 = makeIssue(101, "Older Ticket", {
			createdAt: "2026-08-16T07:00:00Z",
		});
		const issue2 = makeIssue(102, "Newer Ticket", {
			createdAt: "2026-08-16T09:00:00Z",
		});
		const githubClient = new MockGithubClient([issue2, issue1]);

		let executedIssueNumber = 0;
		const executeWorkflow = async (
			options: WorkflowOptions,
		): Promise<ExecutionResult> => {
			executedIssueNumber = options.issueNumber;
			options.onProgress?.("claiming", "Claiming ticket...");
			options.onProgress?.("executing", "Agent running...");
			return {
				attempts: 1,
				branch: "feat/issue-101",
				durationMs: 500,
				issueNumber: options.issueNumber,
				prUrl: "https://github.com/test/repo/pull/1",
				success: true,
			};
		};

		let detectedIssue: CandidateIssue | undefined;
		let claimedIssue: CandidateIssue | undefined;
		let startedIssue: CandidateIssue | undefined;
		let completedIssue: CandidateIssue | undefined;

		const daemon = new WatcherDaemon({
			clock,
			executeWorkflow,
			githubClient,
			logger,
			once: true,
			onTicketClaimed: (issue) => {
				claimedIssue = issue;
			},
			onTicketCompleted: (issue) => {
				completedIssue = issue;
			},
			onTicketDetected: (issue) => {
				detectedIssue = issue;
			},
			onTicketStarted: (issue) => {
				startedIssue = issue;
			},
		});

		// Act
		const stats = await daemon.run();

		// Assert
		expect(executedIssueNumber).toBe(101);
		expect(detectedIssue?.number).toBe(101);
		expect(claimedIssue?.number).toBe(101);
		expect(startedIssue?.number).toBe(101);
		expect(completedIssue?.number).toBe(101);
		expect(stats).toEqual({
			aborted: false,
			failureCount: 0,
			processedCount: 1,
			successCount: 1,
		});
		expect(
			logs.some((l) =>
				l.includes('Found eligible ticket #101: "Older Ticket"'),
			),
		).toBe(true);
	});

	it("stops when --limit is reached across multiple tickets", async () => {
		// Arrange
		const clock = new MockWatcherClock();
		const issue1 = makeIssue(101, "First Ticket", {
			createdAt: "2026-08-16T07:00:00Z",
		});
		const issue2 = makeIssue(102, "Second Ticket", {
			createdAt: "2026-08-16T08:00:00Z",
		});
		const issue3 = makeIssue(103, "Third Ticket", {
			createdAt: "2026-08-16T09:00:00Z",
		});
		const githubClient = new MockGithubClient([issue1, issue2, issue3]);

		const executed: number[] = [];
		const executeWorkflow = async (
			options: WorkflowOptions,
		): Promise<ExecutionResult> => {
			executed.push(options.issueNumber);
			// Remove the executed issue from candidate pool
			const current = await githubClient.getIssue(options.issueNumber);
			githubClient.addIssue({ ...current, assignees: ["@me"] });
			return {
				attempts: 1,
				branch: `feat/issue-${options.issueNumber}`,
				durationMs: 100,
				issueNumber: options.issueNumber,
				success: true,
			};
		};

		const daemon = new WatcherDaemon({
			clock,
			executeWorkflow,
			githubClient,
			limit: 2,
		});

		// Act
		const stats = await daemon.run();

		// Assert
		expect(executed).toEqual([101, 102]);
		expect(stats).toEqual({
			aborted: false,
			failureCount: 0,
			processedCount: 2,
			successCount: 2,
		});
	});

	it("executes in dry-run mode without calling executeWorkflow", async () => {
		// Arrange
		const clock = new MockWatcherClock();
		const logs: string[] = [];
		const logger = (msg: string) => logs.push(msg);
		const issue1 = makeIssue(101, "Dry Ticket");
		const githubClient = new MockGithubClient([issue1]);

		let workflowCalled = false;
		const executeWorkflow = async (): Promise<ExecutionResult> => {
			workflowCalled = true;
			return {
				attempts: 0,
				branch: "",
				durationMs: 0,
				issueNumber: 101,
				success: true,
			};
		};

		let completedIssue: CandidateIssue | undefined;
		const daemon = new WatcherDaemon({
			agent: "claude",
			branch: "feat/dry-custom",
			clock,
			dryRun: true,
			executeWorkflow,
			githubClient,
			logger,
			model: "claude-3-7-sonnet",
			once: true,
			onTicketCompleted: (issue) => {
				completedIssue = issue;
			},
		});

		// Act
		const stats = await daemon.run();

		// Assert
		expect(workflowCalled).toBe(false);
		expect(completedIssue?.number).toBe(101);
		expect(stats.processedCount).toBe(1);
		expect(stats.successCount).toBe(1);
		expect(logs.some((l) => l.includes("[Dry-Run] Target ticket: #101"))).toBe(
			true,
		);
		expect(
			logs.some((l) =>
				l.includes("[Dry-Run] Agent: claude, Model: claude-3-7-sonnet"),
			),
		).toBe(true);
	});

	it("recovers gracefully from transient GitHub API query errors and sleeps for interval", async () => {
		// Arrange
		const clock = new MockWatcherClock();
		const logs: string[] = [];
		const logger = (msg: string) => logs.push(msg);
		const controller = new AbortController();

		let callCount = 0;
		const githubClient = new MockGithubClient();
		githubClient.listCandidateIssues = async () => {
			callCount++;
			if (callCount === 1) {
				throw new Error("HTTP 502 Bad Gateway");
			}
			if (callCount === 2) {
				throw "Unknown network drop";
			}
			controller.abort();
			return [];
		};

		const daemon = new WatcherDaemon({
			clock,
			githubClient,
			intervalSeconds: 10,
			logger,
			signal: controller.signal,
		});

		// Act
		const stats = await daemon.run();

		// Assert
		expect(stats.aborted).toBe(true);
		expect(
			logs.some((l) =>
				l.includes(
					"Failed to query GitHub issues: HTTP 502 Bad Gateway. Retrying next cycle...",
				),
			),
		).toBe(true);
		expect(
			logs.some((l) =>
				l.includes(
					"Failed to query GitHub issues: Unknown network drop. Retrying next cycle...",
				),
			),
		).toBe(true);
	});

	it("handles concurrent claim collision reported via result.error or thrown error", async () => {
		// Arrange
		const clock = new MockWatcherClock();
		const logs: string[] = [];
		const logger = (msg: string) => logs.push(msg);
		const issue1 = makeIssue(101, "Contended Ticket");
		const issue2 = makeIssue(102, "Next Ticket");
		const githubClient = new MockGithubClient([issue1, issue2]);

		let attemptCount = 0;
		const executeWorkflow = async (
			options: WorkflowOptions,
		): Promise<ExecutionResult> => {
			attemptCount++;
			if (options.issueNumber === 101 && attemptCount === 1) {
				return {
					attempts: 0,
					branch: "feat/issue-101",
					durationMs: 10,
					error: "Issue #101 is already claimed by @other",
					issueNumber: 101,
					success: false,
				};
			}
			if (options.issueNumber === 101 && attemptCount === 2) {
				throw new IssueAlreadyClaimedError(101, ["@other"]);
			}
			return {
				attempts: 1,
				branch: "feat/issue-102",
				durationMs: 100,
				issueNumber: 102,
				success: true,
			};
		};

		const daemon = new WatcherDaemon({
			clock,
			executeWorkflow,
			githubClient,
			logger,
			once: true,
		});

		// Act
		const stats = await daemon.run();

		// Assert
		expect(attemptCount).toBe(3);
		expect(stats.processedCount).toBe(1);
		expect(stats.successCount).toBe(1);
		expect(
			logs.some((l) =>
				l.includes("Issue #101 was claimed concurrently. Refreshing queue..."),
			),
		).toBe(true);
		expect(
			logs.some((l) =>
				l.includes("Issue #101 is already claimed. Refreshing queue..."),
			),
		).toBe(true);
	});

	it("handles execution failure from executeWorkflow and logs failure telemetry", async () => {
		// Arrange
		const clock = new MockWatcherClock();
		const logs: string[] = [];
		const logger = (msg: string) => logs.push(msg);
		const issue1 = makeIssue(101, "Failing Ticket");
		const githubClient = new MockGithubClient([issue1]);

		let failedIssue: CandidateIssue | undefined;
		let failureResult: ExecutionResult | undefined;

		const executeWorkflow = async (): Promise<ExecutionResult> => {
			return {
				attempts: 3,
				branch: "feat/issue-101",
				durationMs: 1200,
				error: "Tests failed on attempt 3",
				issueNumber: 101,
				success: false,
			};
		};

		const daemon = new WatcherDaemon({
			clock,
			executeWorkflow,
			githubClient,
			logger,
			once: true,
			onTicketFailed: (issue, res) => {
				failedIssue = issue;
				failureResult = res;
			},
		});

		// Act
		const stats = await daemon.run();

		// Assert
		expect(stats).toEqual({
			aborted: false,
			failureCount: 1,
			processedCount: 1,
			successCount: 0,
		});
		expect(failedIssue?.number).toBe(101);
		expect(failureResult?.error).toBe("Tests failed on attempt 3");
		expect(
			logs.some((l) =>
				l.includes(
					"Execution failed for issue #101: Tests failed on attempt 3",
				),
			),
		).toBe(true);
	});

	it("handles unexpected thrown errors or non-Error objects from executeWorkflow", async () => {
		// Arrange
		const clock = new MockWatcherClock();
		const logs: string[] = [];
		const logger = (msg: string) => logs.push(msg);
		const issue1 = makeIssue(101, "Crashing Ticket 1");
		const issue2 = makeIssue(102, "Crashing Ticket 2");
		const githubClient = new MockGithubClient([issue1, issue2]);

		let callNum = 0;
		const executeWorkflow = async (
			options: WorkflowOptions,
		): Promise<ExecutionResult> => {
			callNum++;
			const current = await githubClient.getIssue(options.issueNumber);
			githubClient.addIssue({ ...current, assignees: ["@me"] });
			if (callNum === 1) {
				throw new Error("Unexpected database crash");
			}
			throw "String error";
		};

		const daemon = new WatcherDaemon({
			clock,
			executeWorkflow,
			githubClient,
			limit: 2,
			logger,
		});

		// Act
		const stats = await daemon.run();

		// Assert
		expect(stats.processedCount).toBe(2);
		expect(stats.failureCount).toBe(2);
		expect(
			logs.some((l) =>
				l.includes(
					"Unexpected error executing issue #101: Unexpected database crash",
				),
			),
		).toBe(true);
		expect(
			logs.some((l) =>
				l.includes("Unexpected error executing issue #102: String error"),
			),
		).toBe(true);
	});

	it("stops loop when workflow execution is aborted", async () => {
		// Arrange
		const clock = new MockWatcherClock();
		const logs: string[] = [];
		const logger = (msg: string) => logs.push(msg);
		const issue1 = makeIssue(101, "Aborted Ticket");
		const githubClient = new MockGithubClient([issue1]);

		const executeWorkflow = async (): Promise<ExecutionResult> => {
			return {
				aborted: true,
				attempts: 1,
				branch: "feat/issue-101",
				durationMs: 50,
				error: "Cancelled by signal",
				issueNumber: 101,
				success: false,
			};
		};

		const daemon = new WatcherDaemon({
			clock,
			executeWorkflow,
			githubClient,
			logger,
		});

		// Act
		const stats = await daemon.run();

		// Assert
		expect(stats.aborted).toBe(true);
		expect(
			logs.some((l) =>
				l.includes("Workflow execution for issue #101 was aborted."),
			),
		).toBe(true);
	});

	it("handles dry-run with default agent, model, and generated branch", async () => {
		// Arrange
		const clock = new MockWatcherClock();
		const logs: string[] = [];
		const logger = (msg: string) => logs.push(msg);
		const issue1 = makeIssue(201, "Dry Run Defaults");
		const githubClient = new MockGithubClient([issue1]);

		const daemon = new WatcherDaemon({
			clock,
			dryRun: true,
			githubClient,
			logger,
			once: true,
		});

		// Act
		const stats = await daemon.run();

		// Assert
		expect(stats.processedCount).toBe(1);
		expect(stats.successCount).toBe(1);
		expect(
			logs.some((l) => l.includes("[Dry-Run] Agent: agy, Model: default")),
		).toBe(true);
	});

	it("handles failure result with undefined error string and progress without detail", async () => {
		// Arrange
		const clock = new MockWatcherClock();
		const logs: string[] = [];
		const logger = (msg: string) => logs.push(msg);
		const issue1 = makeIssue(301, "Undefined Error Ticket");
		const githubClient = new MockGithubClient([issue1]);

		const executeWorkflow = async (
			opts: WorkflowOptions,
		): Promise<ExecutionResult> => {
			opts.onProgress?.("executing"); // No detail
			return {
				attempts: 1,
				branch: "feat/issue-301",
				durationMs: 100,
				issueNumber: 301,
				success: false,
			};
		};

		const daemon = new WatcherDaemon({
			clock,
			executeWorkflow,
			githubClient,
			logger,
			once: true,
		});

		// Act
		const stats = await daemon.run();

		// Assert
		expect(stats.failureCount).toBe(1);
		expect(
			logs.some((l) =>
				l.includes("Execution failed for issue #301: Unknown error"),
			),
		).toBe(true);
	});

	it("instantiates with default options, clock, and github client", () => {
		// Arrange
		const options = {};

		// Act
		const daemon = new WatcherDaemon(options);

		// Assert
		expect(daemon).toBeDefined();
	});

	it("runs with default executeTicketWorkflow and mock dependencies", async () => {
		// Arrange
		const clock = new MockWatcherClock();
		const issue1 = makeIssue(101, "Full Seam Ticket");
		const githubClient = new MockGithubClient([issue1]);
		const lockManager = new MockRunnerLockManager();
		const worktreeManager = new MockWorktreeManager();
		const agentRunner = new MockAgentRunner();

		// Act
		const stats = await runWatcherDaemon({
			agentRunner,
			clock,
			githubClient,
			gitRunner: async () => ({ exitCode: 0, stderr: "", stdout: "" }),
			lockManager,
			logger: () => {},
			once: true,
			validator: async () => ({
				checks: [{ name: "test", output: "ok", success: true }],
				success: true,
			}),
			worktreeManager,
		});

		// Assert
		expect(stats.processedCount).toBe(1);
		expect(stats.successCount).toBe(1);
	});
});
