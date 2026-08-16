import { describe, expect, it } from "vitest";
import { MockGithubClient } from "../../github/client";
import type { CandidateIssue } from "../../github/types";
import type { ExecutionResult, WorkflowOptions } from "../../workflow/types";
import { MockWatcherClock } from "../__mocks__/watcher-clock";
import {
	defaultWatchLogger,
	formatWatchHelp,
	parseWatchCliArgs,
	runWatchCommand,
} from "../watch-command";

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

describe("defaultWatchLogger", () => {
	it("is callable and outputs message to console.log", () => {
		// Arrange
		let captured = "";
		const originalLog = console.log;
		console.log = (msg: string) => {
			captured = msg;
		};

		// Act
		try {
			defaultWatchLogger("watch command log");
		} finally {
			console.log = originalLog;
		}

		// Assert
		expect(captured).toBe("watch command log");
	});
});

describe("parseWatchCliArgs", () => {
	it("returns default args when argv is empty", () => {
		// Arrange
		const argv: string[] = [];

		// Act
		const args = parseWatchCliArgs(argv);

		// Assert
		expect(args).toEqual({
			agent: "codex",
			dangerouslySkipPermissions: true,
			dryRun: false,
			help: false,
			imageName: "sandcastle:watchpoint",
			intervalSeconds: 60,
			localOnly: false,
			maxAttempts: 3,
			once: false,
			pr: true,
			sandbox: "docker",
		});
	});

	it("parses value flags and boolean flags correctly", () => {
		// Arrange
		const argv = [
			"--interval",
			"30",
			"--limit",
			"5",
			"--agent",
			"codex",
			"--model",
			"gpt-4o",
			"--max-attempts",
			"4",
			"--branch",
			"feat/custom",
			"--dry-run",
			"--once",
			"--no-pr",
		];

		// Act
		const args = parseWatchCliArgs(argv);

		// Assert
		expect(args).toEqual({
			agent: "codex",
			branch: "feat/custom",
			dangerouslySkipPermissions: true,
			dryRun: true,
			help: false,
			imageName: "sandcastle:watchpoint",
			intervalSeconds: 30,
			limit: 5,
			localOnly: false,
			maxAttempts: 4,
			model: "gpt-4o",
			once: true,
			pr: false,
			sandbox: "docker",
		});
	});

	it("skips leading 'watch' subcommand if passed in argv", () => {
		// Arrange
		const argv = ["watch", "--interval", "45", "--once"];

		// Act
		const args = parseWatchCliArgs(argv);

		// Assert
		expect(args.intervalSeconds).toBe(45);
		expect(args.once).toBe(true);
	});

	it("parses --help and -h flags", () => {
		// Arrange
		const helpArgv = ["--help"];
		const hArgv = ["-h"];

		// Act
		const argsHelp = parseWatchCliArgs(helpArgv);
		const argsH = parseWatchCliArgs(hArgv);

		// Assert
		expect(argsHelp.help).toBe(true);
		expect(argsH.help).toBe(true);
	});

	it("parses --local-only and --pr flags", () => {
		// Arrange
		const localOnlyArgv = ["--local-only"];
		const prArgv = ["--local-only", "--pr"];

		// Act
		const argsLocalOnly = parseWatchCliArgs(localOnlyArgv);
		const argsPr = parseWatchCliArgs(prArgv);

		// Assert
		expect(argsLocalOnly.localOnly).toBe(true);
		expect(argsLocalOnly.pr).toBe(false);
		expect(argsPr.localOnly).toBe(false);
		expect(argsPr.pr).toBe(true);
	});

	it("parses --retries and --max-retries aliases", () => {
		// Arrange
		const retriesArgv = ["--retries", "2"];
		const maxRetriesArgv = ["--max-retries", "6"];

		// Act
		const argsRetries = parseWatchCliArgs(retriesArgv);
		const argsMaxRetries = parseWatchCliArgs(maxRetriesArgv);

		// Assert
		expect(argsRetries.maxAttempts).toBe(2);
		expect(argsMaxRetries.maxAttempts).toBe(6);
	});

	it("handles trailing value flags without arguments and unknown flags", () => {
		// Arrange
		const argv = ["--unknown", "--agent", "gemini", "--interval"];

		// Act
		const args = parseWatchCliArgs(argv);

		// Assert
		expect(args.agent).toBe("gemini");
		expect(args.intervalSeconds).toBe(60);
	});

	it("throws error for unsupported agent name", () => {
		// Arrange
		const argv = ["--agent", "invalid-agent"];

		// Act
		const parseFn = () => parseWatchCliArgs(argv);

		// Assert
		expect(parseFn).toThrow("Unsupported agent: invalid-agent");
	});

	it("throws error for invalid interval", () => {
		// Arrange
		const argv = ["--interval", "not-a-number"];
		const argvZero = ["--interval", "0"];

		// Act
		const parseFn = () => parseWatchCliArgs(argv);
		const parseZeroFn = () => parseWatchCliArgs(argvZero);

		// Assert
		expect(parseFn).toThrow("Invalid interval");
		expect(parseZeroFn).toThrow("Invalid interval");
	});

	it("throws error for invalid limit", () => {
		// Arrange
		const argv = ["--limit", "-5"];

		// Act
		const parseFn = () => parseWatchCliArgs(argv);

		// Assert
		expect(parseFn).toThrow("Invalid limit");
	});

	it("throws error for invalid max-attempts", () => {
		// Arrange
		const argv = ["--max-attempts", "0"];

		// Act
		const parseFn = () => parseWatchCliArgs(argv);

		// Assert
		expect(parseFn).toThrow("Invalid max-attempts");
	});
});

describe("formatWatchHelp", () => {
	it("returns formatted help documentation", () => {
		// Arrange
		// (no inputs)

		// Act
		const help = formatWatchHelp();

		// Assert
		expect(help).toContain("Sandcastle Background Watcher Daemon");
		expect(help).toContain("USAGE:");
		expect(help).toContain("--interval <seconds>");
		expect(help).toContain("--once");
		expect(help).toContain("--limit <n>");
		expect(help).toContain("Ctrl+C (SIGINT)");
	});
});

describe("runWatchCommand", () => {
	it("prints help and returns null when help is requested", async () => {
		// Arrange
		const logs: string[] = [];
		const logger = (msg: string) => logs.push(msg);

		// Act
		const result = await runWatchCommand({
			args: { help: true },
			logger,
		});

		// Assert
		expect(result).toBeNull();
		expect(
			logs.some((l) => l.includes("Sandcastle Background Watcher Daemon")),
		).toBe(true);
	});

	it("executes daemon with provided options and args", async () => {
		// Arrange
		const clock = new MockWatcherClock();
		const issue1 = makeIssue(101, "Target Ticket");
		const githubClient = new MockGithubClient([issue1]);

		let receivedWorkflowOptions: WorkflowOptions | undefined;
		const executeWorkflow = async (
			opts: WorkflowOptions,
		): Promise<ExecutionResult> => {
			receivedWorkflowOptions = opts;
			return {
				attempts: 1,
				branch: "feat/issue-101",
				durationMs: 100,
				issueNumber: 101,
				success: true,
			};
		};

		// Act
		const result = await runWatchCommand({
			args: {
				agent: "gemini",
				branch: "feat/issue-101",
				intervalSeconds: 15,
				maxAttempts: 2,
				model: "gemini-2.5-pro",
				once: true,
			},
			clock,
			executeWorkflow,
			githubClient,
			logger: () => {},
		});

		// Assert
		expect(result).toEqual({
			aborted: false,
			failureCount: 0,
			processedCount: 1,
			successCount: 1,
		});
		expect(receivedWorkflowOptions?.issueNumber).toBe(101);
		expect(receivedWorkflowOptions?.maxAttempts).toBe(2);
		expect(receivedWorkflowOptions?.branch).toBe("feat/issue-101");
	});

	it("sets up signal handler when signal is omitted and cleans up afterwards", async () => {
		// Arrange
		const clock = new MockWatcherClock();
		const issue1 = makeIssue(101, "Auto Signal Ticket");
		const githubClient = new MockGithubClient([issue1]);

		const originalOn = process.on;
		const originalOff = process.off;
		const attached = new Map<string, unknown>();
		process.on = ((event: string, fn: unknown) => {
			attached.set(event, fn);
			return process;
		}) as unknown as typeof process.on;
		process.off = ((event: string) => {
			attached.delete(event);
			return process;
		}) as unknown as typeof process.off;

		const executeWorkflow = async (
			opts: WorkflowOptions,
		): Promise<ExecutionResult> => {
			return {
				attempts: 1,
				branch: "feat/issue-101",
				durationMs: 100,
				issueNumber: opts.issueNumber,
				success: true,
			};
		};

		// Act
		let result: ExecutionResult | null = null;
		try {
			result = await runWatchCommand({
				args: { once: true },
				clock,
				executeWorkflow,
				githubClient,
				logger: () => {},
			});
		} finally {
			process.on = originalOn;
			process.off = originalOff;
		}

		// Assert
		expect(result?.processedCount).toBe(1);
		expect(result?.successCount).toBe(1);
		expect(attached.size).toBe(0);
	});

	it("uses provided signal and parses process.argv when args is omitted", async () => {
		// Arrange
		const controller = new AbortController();
		controller.abort();
		const clock = new MockWatcherClock();
		const githubClient = new MockGithubClient();

		// Act
		const result = await runWatchCommand({
			clock,
			githubClient,
			logger: () => {},
			signal: controller.signal,
		});

		// Assert
		expect(result?.aborted).toBe(true);
	});

	it("resolves default githubClient, clock, and logger when omitted", async () => {
		// Arrange
		const originalLog = console.log;
		console.log = () => {};
		const controller = new AbortController();
		controller.abort();

		// Act
		let result: unknown;
		try {
			result = await runWatchCommand({
				signal: controller.signal,
			});
		} finally {
			console.log = originalLog;
		}

		// Assert
		expect((result as { aborted?: boolean })?.aborted).toBe(true);
	});
});
