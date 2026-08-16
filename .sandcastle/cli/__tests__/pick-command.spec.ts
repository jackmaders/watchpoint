import { EventEmitter } from "node:events";
import { describe, expect, it } from "vitest";
import { MockGithubClient } from "../../github/client";
import { IssueAlreadyClaimedError } from "../../github/errors";
import type { CandidateIssue } from "../../github/types";
import { MockAgentRunner } from "../../workflow/agent-runner";
import type { ExecutionResult, WorkflowOptions } from "../../workflow/types";
import { MockRunnerLockManager, MockWorktreeManager } from "../../worktree";
import {
	defaultPickLogger,
	formatPickHelp,
	parsePickCliArgs,
	runPickCommand,
} from "../pick-command";
import type { PickerStreamInput, PickerStreamOutput } from "../types";

class MockInputStream extends EventEmitter implements PickerStreamInput {
	isTTY: boolean;
	rawModeEnabled = false;

	constructor(isTTY = true) {
		super();
		this.isTTY = isTTY;
	}

	setRawMode(mode: boolean): void {
		this.rawModeEnabled = mode;
	}

	sendKey(name: string, ctrl = false, str?: string): void {
		const keyStr = str ?? name;
		this.emit("keypress", keyStr, { ctrl, name, sequence: keyStr });
	}
}

class MockOutputStream implements PickerStreamOutput {
	chunks: string[] = [];

	write(chunk: string): boolean {
		this.chunks.push(chunk);
		return true;
	}

	getOutput(): string {
		return this.chunks.join("");
	}
}

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

const tick = () => new Promise((resolve) => setImmediate(resolve));

describe("defaultPickLogger", () => {
	it("is callable and outputs message", () => {
		// Arrange
		let captured = "";
		const originalLog = console.log;
		console.log = (msg: string) => {
			captured = msg;
		};

		// Act
		try {
			defaultPickLogger("test message");
		} finally {
			console.log = originalLog;
		}

		// Assert
		expect(captured).toBe("test message");
	});
});

describe("parsePickCliArgs", () => {
	it("returns default args when argv is empty", () => {
		// Arrange
		const argv: string[] = [];

		// Act
		const args = parsePickCliArgs(argv);

		// Assert
		expect(args).toEqual({
			agent: "codex",
			dangerouslySkipPermissions: true,
			dryRun: false,
			help: false,
			imageName: "sandcastle:watchpoint",
			localOnly: false,
			maxAttempts: 3,
			pr: true,
			sandbox: "docker",
		});
	});

	it("parses --help and -h flags", () => {
		// Arrange
		const helpArgv = ["--help"];
		const hArgv = ["-h"];

		// Act
		const argsHelp = parsePickCliArgs(helpArgv);
		const argsH = parsePickCliArgs(hArgv);

		// Assert
		expect(argsHelp.help).toBe(true);
		expect(argsH.help).toBe(true);
	});

	it("parses value and boolean flags correctly", () => {
		// Arrange
		const argv = [
			"--agent",
			"claude",
			"--model",
			"claude-3-7-sonnet",
			"--max-attempts",
			"5",
			"--branch",
			"feat/custom-branch",
			"--dry-run",
			"--no-pr",
		];

		// Act
		const args = parsePickCliArgs(argv);

		// Assert
		expect(args.agent).toBe("claude");
		expect(args.model).toBe("claude-3-7-sonnet");
		expect(args.maxAttempts).toBe(5);
		expect(args.branch).toBe("feat/custom-branch");
		expect(args.dryRun).toBe(true);
		expect(args.pr).toBe(false);
	});

	it("handles trailing value flags without arguments and unknown flags", () => {
		// Arrange
		const argv = ["--unknown", "--agent", "agy", "--branch"];

		// Act
		const args = parsePickCliArgs(argv);

		// Assert
		expect(args.agent).toBe("agy");
		expect(args.model).toBeUndefined();
		expect(args.branch).toBeUndefined();
	});

	it("parses --local-only and sets pr to false", () => {
		// Arrange
		const argv = ["--local-only"];

		// Act
		const args = parsePickCliArgs(argv);

		// Assert
		expect(args.localOnly).toBe(true);
		expect(args.pr).toBe(false);
	});

	it("parses --pr explicitly and resets local-only", () => {
		// Arrange
		const argv = ["--local-only", "--pr"];

		// Act
		const args = parsePickCliArgs(argv);

		// Assert
		expect(args.pr).toBe(true);
		expect(args.localOnly).toBe(false);
	});

	it("parses --retries and --max-retries aliases", () => {
		// Arrange
		const retriesArgv = ["--retries", "4"];
		const maxRetriesArgv = ["--max-retries", "6"];

		// Act
		const argsRetries = parsePickCliArgs(retriesArgv);
		const argsMaxRetries = parsePickCliArgs(maxRetriesArgv);

		// Assert
		expect(argsRetries.maxAttempts).toBe(4);
		expect(argsMaxRetries.maxAttempts).toBe(6);
	});

	it("throws error for unsupported agent name", () => {
		// Arrange
		const argv = ["--agent", "unknown-agent"];

		// Act & Assert
		expect(() => parsePickCliArgs(argv)).toThrow(
			"Unsupported agent: unknown-agent",
		);
	});

	it("throws error for invalid max-attempts number", () => {
		// Arrange
		const argv = ["--max-attempts", "invalid"];

		// Act & Assert
		expect(() => parsePickCliArgs(argv)).toThrow("Invalid max-attempts");
	});
});

describe("formatPickHelp", () => {
	it("returns formatted help text containing usage, keybindings, and options", () => {
		// Arrange
		// (no inputs required)

		// Act
		const helpText = formatPickHelp();

		// Assert
		expect(helpText).toContain("Sandcastle Frontier Picker");
		expect(helpText).toContain("KEYBINDINGS:");
		expect(helpText).toContain("Enter / Space");
		expect(helpText).toContain("q / Esc / Ctrl+C");
		expect(helpText).toContain("--agent");
		expect(helpText).toContain("--dry-run");
		expect(helpText).toContain("--no-pr");
		expect(helpText).toContain("--local-only");
	});
});

describe("runPickCommand", () => {
	it("returns null immediately if signal is already aborted", async () => {
		// Arrange
		const controller = new AbortController();
		controller.abort();

		// Act
		const result = await runPickCommand({
			signal: controller.signal,
		});

		// Assert
		expect(result).toBeNull();
	});

	it("prints help and returns null when help flag is set", async () => {
		// Arrange
		const logs: string[] = [];
		const logger = (msg: string) => logs.push(msg);

		// Act
		const result = await runPickCommand({
			args: { help: true },
			logger,
		});

		// Assert
		expect(result).toBeNull();
		expect(logs.some((log) => log.includes("Sandcastle Frontier Picker"))).toBe(
			true,
		);
	});

	it("prints notice and returns null when no unblocked frontier issues exist", async () => {
		// Arrange
		const logs: string[] = [];
		const logger = (msg: string) => logs.push(msg);
		const githubClient = new MockGithubClient([
			makeIssue(1, "Blocked Ticket", { blockedBy: 1 }),
			makeIssue(2, "Claimed Ticket", { assignees: ["@someone"] }),
		]);

		// Act
		const result = await runPickCommand({
			githubClient,
			logger,
		});

		// Assert
		expect(result).toBeNull();
		expect(
			logs.some((log) =>
				log.includes("No unblocked ready-for-agent tickets available"),
			),
		).toBe(true);
	});

	it("prints non-TTY summary and returns null when input is not TTY", async () => {
		// Arrange
		const logs: string[] = [];
		const logger = (msg: string) => logs.push(msg);
		const input = new MockInputStream(false);
		const output = new MockOutputStream();
		const githubClient = new MockGithubClient([
			makeIssue(101, "Eligible Issue"),
		]);

		// Act
		const result = await runPickCommand({
			githubClient,
			input,
			logger,
			output,
		});

		// Assert
		expect(result).toBeNull();
		expect(output.getOutput()).toContain(
			"Available Unblocked Frontier Tickets:",
		);
		expect(output.getOutput()).toContain("#101");
	});

	it("returns null when user cancels picker in interactive mode", async () => {
		// Arrange
		const logs: string[] = [];
		const logger = (msg: string) => logs.push(msg);
		const input = new MockInputStream(true);
		const output = new MockOutputStream();
		const githubClient = new MockGithubClient([
			makeIssue(101, "Eligible Issue"),
		]);

		// Act
		const pickPromise = runPickCommand({
			githubClient,
			input,
			logger,
			output,
		});
		await tick();
		input.sendKey("q");
		const result = await pickPromise;

		// Assert
		expect(result).toBeNull();
	});

	it("executes workflow for chosen issue and forwards progress", async () => {
		// Arrange
		const logs: string[] = [];
		const logger = (msg: string) => logs.push(msg);
		const input = new MockInputStream(true);
		const output = new MockOutputStream();
		const agentRunner = new MockAgentRunner();
		const githubClient = new MockGithubClient([
			makeIssue(101, "First Issue"),
			makeIssue(102, "Second Issue"),
		]);
		let executedIssueNumber = 0;
		const executeWorkflow = async (
			options: WorkflowOptions,
		): Promise<ExecutionResult> => {
			executedIssueNumber = options.issueNumber;
			options.onProgress?.("executing", "Agent working...");
			options.onProgress?.("executing"); // undefined detail test
			return {
				attempts: 1,
				branch: "feat/issue-102",
				durationMs: 1500,
				issueNumber: options.issueNumber,
				prUrl: "https://github.com/test/repo/pull/1",
				success: true,
			};
		};

		// Act
		const pickPromise = runPickCommand({
			agentRunner,
			args: { maxAttempts: 5 },
			executeWorkflow,
			githubClient,
			input,
			logger,
			output,
		});
		await tick();
		input.sendKey("down"); // Select #102
		input.sendKey("return");
		const result = await pickPromise;

		// Assert
		expect(executedIssueNumber).toBe(102);
		expect(result).toEqual({
			attempts: 1,
			branch: "feat/issue-102",
			durationMs: 1500,
			issueNumber: 102,
			prUrl: "https://github.com/test/repo/pull/1",
			success: true,
		});
		expect(logs.some((l) => l.includes("[executing] Agent working..."))).toBe(
			true,
		);
	});

	it("returns dry-run execution result without executing workflow when --dry-run is set", async () => {
		// Arrange
		const logs: string[] = [];
		const logger = (msg: string) => logs.push(msg);
		const input = new MockInputStream(true);
		const output = new MockOutputStream();
		const githubClient = new MockGithubClient([makeIssue(101, "First Issue")]);

		// Act
		const pickPromise = runPickCommand({
			args: { dryRun: true },
			githubClient,
			input,
			logger,
			output,
		});
		await tick();
		input.sendKey("return");
		const result = await pickPromise;

		// Assert
		expect(result).toEqual({
			attempts: 0,
			branch: "dry-run/issue-101",
			durationMs: 0,
			issueNumber: 101,
			success: true,
		});
		expect(logs.some((l) => l.includes("[Dry-Run] Target issue: #101"))).toBe(
			true,
		);
	});

	it("handles claim race condition with generic Error containing 'already claimed'", async () => {
		// Arrange
		const logs: string[] = [];
		const logger = (msg: string) => logs.push(msg);
		const input = new MockInputStream(true);
		const output = new MockOutputStream();
		const githubClient = new MockGithubClient([
			makeIssue(101, "First Issue"),
			makeIssue(102, "Second Issue"),
		]);

		let workflowCallCount = 0;
		const executeWorkflow = async (
			options: WorkflowOptions,
		): Promise<ExecutionResult> => {
			workflowCallCount++;
			if (options.issueNumber === 101) {
				const issue101 = await githubClient.getIssue(101);
				githubClient.addIssue({
					...issue101,
					assignees: ["@another-dev"],
				});
				throw new Error("Task is already claimed by someone else");
			}
			return {
				attempts: 1,
				branch: "feat/issue-102",
				durationMs: 1000,
				issueNumber: 102,
				success: true,
			};
		};

		// Act
		const pickPromise = runPickCommand({
			executeWorkflow,
			githubClient,
			input,
			logger,
			output,
		});

		// 1st attempt: user selects #101 (throws already claimed)
		await tick();
		input.sendKey("return");

		// Wait a tick for catch block to log and rerender
		await tick();
		await tick();

		// 2nd attempt: picker is refreshed with only #102 in frontier; user selects #102
		input.sendKey("return");
		const result = await pickPromise;

		// Assert
		expect(workflowCallCount).toBe(2);
		expect(result?.issueNumber).toBe(102);
		expect(result?.success).toBe(true);
		expect(
			logs.some((l) =>
				l.includes("Issue #101 is already claimed. Refreshing frontier..."),
			),
		).toBe(true);
	});

	it("handles claim race condition with IssueAlreadyClaimedError without leading @", async () => {
		// Arrange
		const logs: string[] = [];
		const logger = (msg: string) => logs.push(msg);
		const input = new MockInputStream(true);
		const output = new MockOutputStream();
		const githubClient = new MockGithubClient([
			makeIssue(101, "First Issue"),
			makeIssue(102, "Second Issue"),
		]);

		let workflowCallCount = 0;
		const executeWorkflow = async (
			options: WorkflowOptions,
		): Promise<ExecutionResult> => {
			workflowCallCount++;
			if (options.issueNumber === 101) {
				const issue101 = await githubClient.getIssue(101);
				githubClient.addIssue({
					...issue101,
					assignees: ["another-dev"],
				});
				throw new IssueAlreadyClaimedError(101, ["another-dev"]);
			}
			return {
				attempts: 1,
				branch: "feat/issue-102",
				durationMs: 1000,
				issueNumber: 102,
				success: true,
			};
		};

		// Act
		const pickPromise = runPickCommand({
			executeWorkflow,
			githubClient,
			input,
			logger,
			output,
		});

		// 1st attempt: user selects #101 (throws already claimed)
		await tick();
		input.sendKey("return");

		// Wait a tick for catch block to log and rerender
		await tick();
		await tick();

		// 2nd attempt: picker is refreshed with only #102 in frontier; user selects #102
		input.sendKey("return");
		const result = await pickPromise;

		// Assert
		expect(workflowCallCount).toBe(2);
		expect(result?.issueNumber).toBe(102);
		expect(result?.success).toBe(true);
		expect(
			logs.some((l) =>
				l.includes("Issue #101 is already claimed by @another-dev"),
			),
		).toBe(true);
	});

	it("handles claim race condition with IssueAlreadyClaimedError with leading @", async () => {
		// Arrange
		const logs: string[] = [];
		const logger = (msg: string) => logs.push(msg);
		const input = new MockInputStream(true);
		const output = new MockOutputStream();
		const githubClient = new MockGithubClient([
			makeIssue(101, "First Issue"),
			makeIssue(102, "Second Issue"),
		]);

		let workflowCallCount = 0;
		const executeWorkflow = async (
			options: WorkflowOptions,
		): Promise<ExecutionResult> => {
			workflowCallCount++;
			if (options.issueNumber === 101) {
				const issue101 = await githubClient.getIssue(101);
				githubClient.addIssue({
					...issue101,
					assignees: ["@another-dev"],
				});
				throw new IssueAlreadyClaimedError(101, ["@another-dev"]);
			}
			return {
				attempts: 1,
				branch: "feat/issue-102",
				durationMs: 1000,
				issueNumber: 102,
				success: true,
			};
		};

		// Act
		const pickPromise = runPickCommand({
			executeWorkflow,
			githubClient,
			input,
			logger,
			output,
		});
		await tick();
		input.sendKey("return");
		await tick();
		await tick();
		input.sendKey("return");
		const result = await pickPromise;

		// Assert
		expect(workflowCallCount).toBe(2);
		expect(result?.issueNumber).toBe(102);
		expect(result?.success).toBe(true);
		expect(
			logs.some((l) =>
				l.includes("Issue #101 is already claimed by @another-dev"),
			),
		).toBe(true);
	});

	it("handles claim race condition with IssueAlreadyClaimedError and empty assignees list", async () => {
		// Arrange
		const logs: string[] = [];
		const logger = (msg: string) => logs.push(msg);
		const input = new MockInputStream(true);
		const output = new MockOutputStream();
		const githubClient = new MockGithubClient([
			makeIssue(101, "First Issue"),
			makeIssue(102, "Second Issue"),
		]);

		let workflowCallCount = 0;
		const executeWorkflow = async (
			options: WorkflowOptions,
		): Promise<ExecutionResult> => {
			workflowCallCount++;
			if (options.issueNumber === 101) {
				const issue101 = await githubClient.getIssue(101);
				githubClient.addIssue({
					...issue101,
					assignees: ["@another-dev"],
				});
				throw new IssueAlreadyClaimedError(101, []);
			}
			return {
				attempts: 1,
				branch: "feat/issue-102",
				durationMs: 1000,
				issueNumber: 102,
				success: true,
			};
		};

		// Act
		const pickPromise = runPickCommand({
			executeWorkflow,
			githubClient,
			input,
			logger,
			output,
		});
		await tick();
		input.sendKey("return");
		await tick();
		await tick();
		input.sendKey("return");
		const result = await pickPromise;

		// Assert
		expect(workflowCallCount).toBe(2);
		expect(result?.issueNumber).toBe(102);
		expect(
			logs.some((l) =>
				l.includes("Issue #101 is already claimed. Refreshing frontier..."),
			),
		).toBe(true);
	});

	it("handles claim error reported inside ExecutionResult.error", async () => {
		// Arrange
		const logs: string[] = [];
		const logger = (msg: string) => logs.push(msg);
		const input = new MockInputStream(true);
		const output = new MockOutputStream();
		const githubClient = new MockGithubClient([
			makeIssue(101, "First Issue"),
			makeIssue(102, "Second Issue"),
		]);

		let workflowCallCount = 0;
		const executeWorkflow = async (
			options: WorkflowOptions,
		): Promise<ExecutionResult> => {
			workflowCallCount++;
			if (options.issueNumber === 101) {
				const issue101 = await githubClient.getIssue(101);
				githubClient.addIssue({
					...issue101,
					assignees: ["@another-dev"],
				});
				return {
					attempts: 0,
					branch: "feat/issue-101",
					durationMs: 50,
					error: "Issue #101 is already claimed by @another-dev",
					issueNumber: 101,
					success: false,
				};
			}
			return {
				attempts: 1,
				branch: "feat/issue-102",
				durationMs: 1000,
				issueNumber: 102,
				success: true,
			};
		};

		// Act
		const pickPromise = runPickCommand({
			executeWorkflow,
			githubClient,
			input,
			logger,
			output,
		});

		// 1st attempt: user selects #101
		await tick();
		input.sendKey("return");

		// Wait a tick for refresh
		await tick();
		await tick();

		// 2nd attempt: user selects #102
		input.sendKey("return");
		const result = await pickPromise;

		// Assert
		expect(workflowCallCount).toBe(2);
		expect(result?.issueNumber).toBe(102);
		expect(
			logs.some((l) => l.includes("Issue #101 was claimed concurrently")),
		).toBe(true);
	});

	it("rethrows non-claim error from executeWorkflow", async () => {
		// Arrange
		const logs: string[] = [];
		const logger = (msg: string) => logs.push(msg);
		const input = new MockInputStream(true);
		const output = new MockOutputStream();
		const githubClient = new MockGithubClient([makeIssue(101, "First Issue")]);

		const executeWorkflow = async (): Promise<ExecutionResult> => {
			throw new Error("Unexpected database crash");
		};

		// Act
		const pickPromise = runPickCommand({
			executeWorkflow,
			githubClient,
			input,
			logger,
			output,
		});
		await tick();
		input.sendKey("return");

		// Assert
		await expect(pickPromise).rejects.toThrow("Unexpected database crash");
	});

	it("rethrows non-Error thrown objects from executeWorkflow", async () => {
		// Arrange
		const logs: string[] = [];
		const logger = (msg: string) => logs.push(msg);
		const input = new MockInputStream(true);
		const output = new MockOutputStream();
		const githubClient = new MockGithubClient([makeIssue(101, "First Issue")]);

		const executeWorkflow = async (): Promise<ExecutionResult> => {
			throw "primitive error string";
		};

		// Act
		const pickPromise = runPickCommand({
			executeWorkflow,
			githubClient,
			input,
			logger,
			output,
		});
		await tick();
		input.sendKey("return");

		// Assert
		await expect(pickPromise).rejects.toBe("primitive error string");
	});

	it("uses default executeTicketWorkflow when executeWorkflow is omitted", async () => {
		// Arrange
		const logs: string[] = [];
		const logger = (msg: string) => logs.push(msg);
		const input = new MockInputStream(true);
		const output = new MockOutputStream();
		const agentRunner = new MockAgentRunner();
		const githubClient = new MockGithubClient([makeIssue(101, "First Issue")]);
		const lockManager = new MockRunnerLockManager();
		const worktreeManager = new MockWorktreeManager();

		// Act
		const pickPromise = runPickCommand({
			agentRunner,
			githubClient,
			gitRunner: async () => ({ exitCode: 0, stderr: "", stdout: "" }),
			input,
			lockManager,
			logger,
			output,
			validator: async () => ({
				checks: [{ name: "test", output: "ok", success: true }],
				success: true,
			}),
			worktreeManager,
		});
		await tick();
		input.sendKey("return");
		const result = await pickPromise;

		// Assert
		expect(result?.issueNumber).toBe(101);
		expect(result?.success).toBe(true);
	});
});
