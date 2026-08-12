import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as github from "@actions/github";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ExecFn, ExecResult } from "../exec";
import type { IssueContext } from "../github";
import { LABELS } from "../github";
import {
	run as implementPrRun,
	postFeedbackResponses,
	REQUIRED_QUALITY_CHECK_NAMES,
	runImplementPr,
	validateImplementPrOutput,
} from "../implement-pr";
import {
	type ObjectRunOptions,
	type RunAgentResult,
	runAgent,
} from "../run-agent";
import { type ImplementPr, OUTPUTS } from "../schemas";

vi.mock("@actions/github");
vi.mock("../exec");
vi.mock("../logger");
vi.mock("../run-agent");

const WORKFLOW_FILE = join(
	import.meta.dirname,
	"..",
	"..",
	"..",
	".github",
	"workflows",
	"agent-implement-pr.yml",
);
const REVIEW_WORKFLOW_FILE = join(
	import.meta.dirname,
	"..",
	"..",
	"..",
	".github",
	"workflows",
	"agent-review.yml",
);
const PROMPT_FILE = join(
	import.meta.dirname,
	"..",
	"prompts",
	"implement-pr.md",
);

function buildContext(): IssueContext {
	const successfulJobs = REQUIRED_QUALITY_CHECK_NAMES.map((name) => ({
		conclusion: "success",
		name,
		status: "completed",
	}));
	const octokit = {
		paginate: vi.fn().mockResolvedValue([]),
		rest: {
			actions: {
				listJobsForWorkflowRun: vi.fn().mockResolvedValue({
					data: { jobs: successfulJobs },
				}),
				listWorkflowRunsForRepo: vi.fn().mockResolvedValue({
					data: {
						workflow_runs: [
							{
								conclusion: "success",
								head_sha: "sha123",
								id: 123,
								name: "PR Quality Checks",
								status: "completed",
							},
						],
					},
				}),
			},
			issues: {
				addLabels: vi.fn().mockResolvedValue({}),
				createComment: vi.fn().mockResolvedValue({}),
				get: vi.fn().mockResolvedValue({ data: { body: "Issue context." } }),
				listComments: vi.fn(),
				removeLabel: vi.fn().mockResolvedValue({}),
			},
			pulls: {
				get: vi.fn(),
				listReviewComments: vi.fn(),
				listReviews: vi.fn(),
			},
		},
	} as unknown as IssueContext["octokit"];

	return {
		issueNumber: 42,
		octokit: octokit,
		owner: "jackmaders",
		repo: "watchpoint",
	};
}

function fakeResult(output: ImplementPr): RunAgentResult<ImplementPr> {
	return {
		output,
		raw: "",
		sessionId: "session-1",
		usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
	};
}

function feedback(sourceId: string): ImplementPr["feedback"][number] {
	return {
		reason: "The response is grounded in the current diff.",
		response: "Addressed this feedback.",
		sourceId,
		status: "fixed",
	};
}

function buildFixExec(
	execCalls: Array<{ command: string; args: string[] }>,
): ExecFn {
	const gitOutputs: Record<string, string> = {
		diff: "+fixed\n",
		"merge-base": "abc123\n",
		"rev-parse": "sha123\n",
		status: " M src/fix.ts\n",
	};
	return async (command, args): Promise<ExecResult> => {
		execCalls.push({ args, command });
		return {
			exitCode: 0,
			stderr: "",
			stdout: command === "git" ? (gitOutputs[args[0] ?? ""] ?? "") : "",
		};
	};
}

describe("validateImplementPrOutput", () => {
	it("accepts exactly one outcome for every known feedback source", () => {
		// Arrange
		const output: ImplementPr = {
			feedback: [feedback("inline:9001"), feedback("comment:7001")],
			summary: "Addressed the feedback.",
		};

		// Act
		const result = validateImplementPrOutput(output, [
			"inline:9001",
			"comment:7001",
		]);

		// Assert
		expect(result).toEqual({ valid: true });
	});

	it.each([
		["duplicate", [feedback("inline:9001"), feedback("inline:9001")]],
		["unknown", [feedback("inline:9001"), feedback("comment:9999")]],
		["omitted", [feedback("inline:9001")]],
	])(
		"rejects %s feedback source ids before mutation",
		(_label, feedbackItems) => {
			// Arrange
			const output: ImplementPr = {
				feedback: feedbackItems,
				summary: "Addressed the feedback.",
			};

			// Act
			const result = validateImplementPrOutput(output, [
				"inline:9001",
				"comment:7001",
			]);

			// Assert
			expect(result).toEqual(
				expect.objectContaining({
					reason: expect.any(String),
					valid: false,
				}),
			);
		},
	);
});

describe("postFeedbackResponses", () => {
	it("rejects a response whose source is absent", async () => {
		// Arrange
		const ctx = buildContext();
		const exec: ExecFn = async () => ({
			exitCode: 0,
			stderr: "",
			stdout: "",
		});

		// Act
		const act = postFeedbackResponses(
			[feedback("inline:missing")],
			new Map(),
			ctx,
			exec,
		);

		// Assert
		await expect(act).rejects.toThrow("inline:missing");
	});
});

describe("implement-pr workflow contract", () => {
	it("runs on PR dev:needed labels and shares the review concurrency group", () => {
		// Arrange
		const workflow = readFileSync(WORKFLOW_FILE, "utf-8");

		// Act
		const trigger = workflow.includes(
			"github.event.label.name == 'dev:needed'",
		);

		// Assert
		expect(workflow).toContain("pull_request_target:");
		expect(trigger).toBe(true);
		expect(workflow).toContain(
			`group: agent-mutate-pr-\${{ github.event.pull_request.number }}`,
		);
		expect(workflow).not.toContain("gh pr merge");
	});

	it("gates both mutating PR workflows and hands untrusted authors to a human", () => {
		// Arrange
		const implementWorkflow = readFileSync(WORKFLOW_FILE, "utf-8");
		const reviewWorkflow = readFileSync(REVIEW_WORKFLOW_FILE, "utf-8");
		const workflows = `${implementWorkflow}\n${reviewWorkflow}`;

		// Act
		const allowedAssociations = ["OWNER", "MEMBER", "COLLABORATOR"];

		// Assert
		for (const association of allowedAssociations) {
			expect(workflows).toContain(
				`github.event.pull_request.author_association == '${association}'`,
			);
		}
		expect(workflows).toContain("review:escalated");
		expect(workflows).toContain("dev:needed");
		expect(workflows).toContain("review:needed");
		expect(workflows).toContain("untrusted author");
	});

	it("gives the fix agent the four standing GitHub prohibitions", () => {
		// Arrange
		const prompt = readFileSync(PROMPT_FILE, "utf-8");

		// Act
		const prohibitions = [
			"Do not close the issue.",
			"Do not edit labels.",
			"Do not create PRs.",
			"Do not edit PRs.",
		];

		// Assert
		for (const prohibition of prohibitions) {
			expect(prompt).toContain(prohibition);
		}
	});

	it("requires source-aware classification for every feedback surface", () => {
		// Arrange
		const prompt = readFileSync(PROMPT_FILE, "utf-8");

		// Act
		const requiredInstructions = [
			"top-level PR comments",
			"PR review bodies",
			"inline PR review",
			"exactly one outcome for every source",
			"transiently-not-actionable",
			"invent source ids",
		];

		// Assert
		for (const instruction of requiredInstructions) {
			expect(prompt).toContain(instruction);
		}
	});

	it("declares Actions read access for the exact-SHA quality gate", () => {
		// Arrange
		const workflow = readFileSync(WORKFLOW_FILE, "utf-8");

		// Act
		const permissions = workflow.slice(
			workflow.indexOf("permissions:"),
			workflow.indexOf("concurrency:"),
		);

		// Assert
		expect(permissions).toContain("actions: read");
	});

	it("uses the PAT for trusted PR checkout and push when configured", () => {
		// Arrange
		const workflow = readFileSync(WORKFLOW_FILE, "utf-8");

		// Act
		const checkout = workflow.slice(
			workflow.indexOf("- name: 🛒 Checkout PR head"),
			workflow.indexOf("- name: ⚡ Setup Bun"),
		);

		// Assert
		expect(checkout).toContain(
			`token: \${{ secrets.AGENT_PAT || secrets.GITHUB_TOKEN }}`,
		);
	});
});

describe("runImplementPr", () => {
	afterEach(() => {
		Reflect.deleteProperty(process.env, "AGENT_PAT");
		vi.clearAllMocks();
	});

	it("fixes the checked-out PR, replies to resolved threads, and chains review", async () => {
		// Arrange
		process.env.AGENT_PAT = "pat-token";
		const ctx = buildContext();
		vi.mocked(github.getOctokit).mockReturnValue(
			ctx.octokit as ReturnType<typeof github.getOctokit>,
		);
		vi.mocked(ctx.octokit.rest.pulls.get).mockResolvedValue({
			data: {
				body: "Closes #17",
				head: { ref: "agent/issue-17-fix-review" },
				labels: [{ name: LABELS.devNeeded }],
			},
		} as unknown as Awaited<ReturnType<typeof ctx.octokit.rest.pulls.get>>);
		vi.mocked(ctx.octokit.rest.issues.get).mockResolvedValue({
			data: { body: "The originating ticket." },
		} as unknown as Awaited<ReturnType<typeof ctx.octokit.rest.issues.get>>);
		vi.mocked(ctx.octokit.paginate).mockImplementation(
			async (endpoint, params) => {
				if (
					endpoint === ctx.octokit.rest.pulls.listReviewComments &&
					(params as { pull_number?: number }).pull_number === 42
				) {
					return [
						{
							body: "Please validate this input.",
							id: 9001,
							in_reply_to_id: null,
							line: 12,
							path: "scripts/agents/input.ts",
							user: { login: "reviewer" },
						},
					];
				}
				return [];
			},
		);

		const runnerCalls: ObjectRunOptions<ImplementPr>[] = [];
		const runner = async (
			options: ObjectRunOptions<ImplementPr>,
		): Promise<RunAgentResult<ImplementPr>> => {
			runnerCalls.push(options);
			return fakeResult({
				feedback: [
					{
						reason: "The input validation now covers this case.",
						response: "Fixed and covered.",
						sourceId: "inline:9001",
						status: "fixed",
					},
				],
				summary: "Fixed the review finding.",
			});
		};
		const execCalls: Array<{ command: string; args: string[] }> = [];
		const responses: Record<
			string,
			{ exitCode: number; stderr: string; stdout: string }
		> = {
			"git:diff": {
				exitCode: 0,
				stderr: "",
				stdout: "+export const fixed = true;",
			},
			"git:merge-base": { exitCode: 0, stderr: "", stdout: "abc123\n" },
			"git:rev-parse": { exitCode: 0, stderr: "", stdout: "sha123\n" },
			"git:status": { exitCode: 0, stderr: "", stdout: " M src/fix.ts\n" },
		};
		const exec: ExecFn = async (command, args) => {
			execCalls.push({ args, command });
			return (
				responses[`${command}:${args[0] as string}`] ?? {
					exitCode: 0,
					stderr: "",
					stdout: "",
				}
			);
		};

		// Act
		await runImplementPr(ctx, runner, exec);

		// Assert
		expect(runnerCalls).toHaveLength(1);
		expect(runnerCalls[0]?.output).toBe(OUTPUTS["implement-pr"]);
		expect(runnerCalls[0]?.skills).toEqual(["implement"]);
		expect(runnerCalls[0]?.promptArgs).toEqual(
			expect.objectContaining({
				BRANCH_NAME: "agent/issue-17-fix-review",
				DIFF: "+export const fixed = true;",
				ISSUE_NUMBER: "17",
				REVIEW_THREADS: expect.stringContaining("9001"),
				TICKET: expect.stringContaining("The originating ticket."),
			}),
		);
		expect(execCalls).toContainEqual({
			args: ["push", "origin", "HEAD:agent/issue-17-fix-review"],
			command: "git",
		});
		expect(execCalls).toContainEqual({
			args: [
				"api",
				"--method",
				"POST",
				"repos/{owner}/{repo}/pulls/comments/9001/replies",
				"--field",
				"body=<!-- bot-comment -->\nReplying to [inline review comment 9001](https://github.com/jackmaders/watchpoint/pull/42#discussion_r9001):\n\nFixed and covered.",
			],
			command: "gh",
		});
		expect(ctx.octokit.rest.issues.addLabels).toHaveBeenCalledWith(
			expect.objectContaining({
				issue_number: 42,
				labels: [LABELS.reviewNeeded],
			}),
		);
	});

	it("passes paginated comments, review bodies, bot comments, and inline threads with source-aware replies", async () => {
		// Arrange
		process.env.AGENT_PAT = "pat-token";
		const ctx = buildContext();
		vi.mocked(github.getOctokit).mockReturnValue(
			ctx.octokit as ReturnType<typeof github.getOctokit>,
		);
		vi.mocked(ctx.octokit.rest.pulls.get).mockResolvedValue({
			data: {
				body: "No issue link.",
				head: { ref: "feature/complete-feedback" },
				labels: [{ name: LABELS.devNeeded }],
			},
		} as unknown as Awaited<ReturnType<typeof ctx.octokit.rest.pulls.get>>);
		vi.mocked(ctx.octokit.paginate).mockImplementation(async (endpoint) => {
			if (endpoint === ctx.octokit.rest.issues.listComments) {
				return [
					{
						body: "Top-level finding.",
						id: 7001,
						user: { login: "reviewer" },
					},
					{
						body: "<!-- bot-comment -->\nPrior automation note.",
						id: 7002,
						user: { login: "watchpoint-agent[bot]" },
					},
				];
			}
			if (endpoint === ctx.octokit.rest.pulls.listReviews) {
				return [
					{
						body: "Review body finding.",
						id: 8001,
						state: "CHANGES_REQUESTED",
						user: { login: "reviewer" },
					},
				];
			}
			if (endpoint === ctx.octokit.rest.pulls.listReviewComments) {
				return [
					{
						body: "Inline finding.",
						id: 9001,
						in_reply_to_id: null,
						line: 12,
						path: "scripts/agents/input.ts",
						user: { login: "reviewer" },
					},
				];
			}
			return [];
		});

		let reviewThreads = "";
		const runner = async (
			options: ObjectRunOptions<ImplementPr>,
		): Promise<RunAgentResult<ImplementPr>> => {
			reviewThreads = options.promptArgs.REVIEW_THREADS;
			return fakeResult({
				feedback: [
					{
						reason: "Fixed the top-level finding.",
						response: "Fixed the top-level finding.",
						sourceId: "comment:7001",
						status: "fixed",
					},
					{
						reason: "The bot note is informational.",
						response: "No action was needed for this note.",
						sourceId: "comment:7002",
						status: "fixed",
					},
					{
						reason: "Fixed the review body finding.",
						response: "Fixed the review body finding.",
						sourceId: "review:8001",
						status: "fixed",
					},
					{
						reason: "Fixed the inline finding.",
						response: "Fixed the inline finding.",
						sourceId: "inline:9001",
						status: "fixed",
					},
				],
				summary: "Addressed all feedback.",
			});
		};
		const execCalls: Array<{ command: string; args: string[] }> = [];
		const exec = buildFixExec(execCalls);

		// Act
		await runImplementPr(ctx, runner, exec);

		// Assert
		expect(reviewThreads).toContain("comment:7001");
		expect(reviewThreads).toContain("comment:7002");
		expect(reviewThreads).toContain("review:8001");
		expect(reviewThreads).toContain("inline:9001");
		expect(execCalls).toContainEqual(
			expect.objectContaining({
				args: expect.arrayContaining([
					"repos/{owner}/{repo}/pulls/comments/9001/replies",
				]),
				command: "gh",
			}),
		);
		const topLevelReplies = execCalls.filter(
			(call) =>
				call.command === "gh" &&
				call.args.includes("repos/{owner}/{repo}/issues/42/comments"),
		);
		expect(topLevelReplies).toHaveLength(3);
		expect(topLevelReplies.map((call) => call.args.at(-1))).toEqual(
			expect.arrayContaining([
				expect.stringContaining("issuecomment-7001"),
				expect.stringContaining("pullrequestreview-8001"),
			]),
		);
	});

	it("escalates an output-integrity failure before any git mutation", async () => {
		// Arrange
		Reflect.deleteProperty(process.env, "AGENT_PAT");
		const ctx = buildContext();
		vi.mocked(ctx.octokit.rest.pulls.get).mockResolvedValue({
			data: {
				body: "No issue link.",
				head: { ref: "feature/invalid-output" },
				labels: [{ name: LABELS.devNeeded }],
			},
		} as unknown as Awaited<ReturnType<typeof ctx.octokit.rest.pulls.get>>);
		const runner = async (): Promise<RunAgentResult<ImplementPr>> =>
			fakeResult({
				feedback: [
					{
						reason: "I addressed it.",
						response: "Done.",
						sourceId: "inline:unknown",
						status: "fixed",
					},
				],
				summary: "Done.",
			});
		const execCalls: Array<{ command: string; args: string[] }> = [];
		const exec = buildFixExec(execCalls);

		// Act
		await runImplementPr(ctx, runner, exec);

		// Assert
		expect(execCalls).not.toContainEqual(
			expect.objectContaining({
				args: expect.arrayContaining(["add", "-A"]),
				command: "git",
			}),
		);
		expect(execCalls).not.toContainEqual(
			expect.objectContaining({
				args: expect.arrayContaining(["push"]),
				command: "git",
			}),
		);
		expect(ctx.octokit.rest.issues.addLabels).toHaveBeenCalledWith(
			expect.objectContaining({ labels: [LABELS.reviewEscalated] }),
		);
		expect(ctx.octokit.rest.issues.createComment).toHaveBeenCalledWith(
			expect.objectContaining({
				body: expect.stringContaining("invalid feedback classification"),
			}),
		);
	});

	it("replies to valid feedback before escalating alongside invalid feedback", async () => {
		// Arrange
		Reflect.deleteProperty(process.env, "AGENT_PAT");
		const ctx = buildContext();
		vi.mocked(ctx.octokit.rest.pulls.get).mockResolvedValue({
			data: {
				body: "No issue link.",
				head: { ref: "feature/mixed-feedback" },
				labels: [{ name: LABELS.devNeeded }],
			},
		} as unknown as Awaited<ReturnType<typeof ctx.octokit.rest.pulls.get>>);
		vi.mocked(ctx.octokit.paginate).mockImplementation(async (endpoint) =>
			endpoint === ctx.octokit.rest.pulls.listReviewComments
				? [
						{
							body: "Valid.",
							id: 9001,
							in_reply_to_id: null,
							line: 1,
							path: "src/fix.ts",
							user: { login: "reviewer" },
						},
						{
							body: "Invalid.",
							id: 9002,
							in_reply_to_id: null,
							line: 2,
							path: "src/fix.ts",
							user: { login: "reviewer" },
						},
					]
				: [],
		);
		const runner = async (): Promise<RunAgentResult<ImplementPr>> =>
			fakeResult({
				feedback: [
					{
						reason: "The code now handles this case.",
						response: "Fixed the valid finding.",
						sourceId: "inline:9001",
						status: "fixed",
					},
					{
						reason: "This finding targets behavior that is not present.",
						response: "This finding does not apply to the changed code.",
						sourceId: "inline:9002",
						status: "invalid",
					},
				],
				summary: "Addressed the valid finding.",
			});
		const execCalls: Array<{ command: string; args: string[] }> = [];
		const exec = buildFixExec(execCalls);

		// Act
		await runImplementPr(ctx, runner, exec);

		// Assert
		expect(execCalls.filter((call) => call.command === "gh")).toHaveLength(2);
		expect(ctx.octokit.rest.issues.addLabels).toHaveBeenCalledWith(
			expect.objectContaining({ labels: [LABELS.reviewEscalated] }),
		);
		expect(ctx.octokit.rest.issues.addLabels).not.toHaveBeenCalledWith(
			expect.objectContaining({ labels: [LABELS.reviewNeeded] }),
		);
	});

	it("escalates a failed quality check without chaining review", async () => {
		// Arrange
		Reflect.deleteProperty(process.env, "AGENT_PAT");
		const ctx = buildContext();
		vi.mocked(ctx.octokit.rest.pulls.get).mockResolvedValue({
			data: {
				body: "No issue link.",
				head: { ref: "feature/quality-failure" },
				labels: [{ name: LABELS.devNeeded }],
			},
		} as unknown as Awaited<ReturnType<typeof ctx.octokit.rest.pulls.get>>);
		vi.mocked(
			ctx.octokit.rest.actions.listJobsForWorkflowRun,
		).mockResolvedValue({
			data: {
				jobs: REQUIRED_QUALITY_CHECK_NAMES.map((name, index) => ({
					conclusion: index === 0 ? "failure" : "success",
					name,
					status: "completed",
				})),
			},
		} as unknown as Awaited<
			ReturnType<typeof ctx.octokit.rest.actions.listJobsForWorkflowRun>
		>);
		const runner = async (): Promise<RunAgentResult<ImplementPr>> =>
			fakeResult({ feedback: [], summary: "No PR feedback was present." });
		const exec: ExecFn = async (_command, args) =>
			args[0] === "merge-base"
				? { exitCode: 0, stderr: "", stdout: "abc123\n" }
				: args[0] === "rev-parse"
					? { exitCode: 0, stderr: "", stdout: "sha123\n" }
					: { exitCode: 0, stderr: "", stdout: "" };

		// Act
		await runImplementPr(ctx, runner, exec);

		// Assert
		expect(ctx.octokit.rest.issues.addLabels).toHaveBeenCalledWith(
			expect.objectContaining({ labels: [LABELS.reviewEscalated] }),
		);
		expect(ctx.octokit.rest.issues.addLabels).not.toHaveBeenCalledWith(
			expect.objectContaining({ labels: [LABELS.reviewNeeded] }),
		);
	});

	it("handles a PR without a ticket when no changes or PAT are available", async () => {
		// Arrange
		const ctx = buildContext();
		vi.mocked(ctx.octokit.rest.pulls.get).mockResolvedValue({
			data: {
				body: null,
				head: { ref: "feature/no-ticket" },
				labels: [{ name: LABELS.devNeeded }],
			},
		} as unknown as Awaited<ReturnType<typeof ctx.octokit.rest.pulls.get>>);
		vi.mocked(ctx.octokit.rest.pulls.listReviewComments).mockResolvedValue({
			data: [],
		} as unknown as Awaited<
			ReturnType<typeof ctx.octokit.rest.pulls.listReviewComments>
		>);

		const runnerCalls: ObjectRunOptions<ImplementPr>[] = [];
		const runner = async (
			options: ObjectRunOptions<ImplementPr>,
		): Promise<RunAgentResult<ImplementPr>> => {
			runnerCalls.push(options);
			return fakeResult({ feedback: [], summary: "No changes needed." });
		};
		const execCalls: Array<{ command: string; args: string[] }> = [];
		const exec: ExecFn = async (command, args) => {
			execCalls.push({ args, command });
			if (command === "git" && args[0] === "merge-base") {
				return { exitCode: 0, stderr: "", stdout: "abc123\n" };
			}
			if (command === "git" && args[0] === "rev-parse") {
				return { exitCode: 0, stderr: "", stdout: "sha123\n" };
			}
			return { exitCode: 0, stderr: "", stdout: "" };
		};

		// Act
		await runImplementPr(ctx, runner, exec);

		// Assert
		expect(runnerCalls[0]?.promptArgs).toEqual(
			expect.objectContaining({
				ISSUE_NUMBER: "42",
				REVIEW_THREADS: "No existing PR feedback.",
				TICKET: "No originating issue was found.",
			}),
		);
		expect(execCalls).not.toContainEqual({
			args: ["add", "-A"],
			command: "git",
		});
		expect(ctx.octokit.rest.issues.createComment).toHaveBeenCalledWith(
			expect.objectContaining({
				body: expect.stringContaining("AGENT_PAT"),
			}),
		);
	});

	it("formats sparse review comments before sending them to the agent", async () => {
		// Arrange
		process.env.AGENT_PAT = "pat-token";
		const ctx = buildContext();
		vi.mocked(ctx.octokit.rest.pulls.get).mockResolvedValue({
			data: {
				body: "No ticket link.",
				head: { ref: "feature/sparse-comment" },
				labels: [],
			},
		} as unknown as Awaited<ReturnType<typeof ctx.octokit.rest.pulls.get>>);
		vi.mocked(ctx.octokit.paginate).mockImplementation(async (endpoint) =>
			endpoint === ctx.octokit.rest.pulls.listReviewComments
				? [
						{
							body: null,
							id: 9002,
							in_reply_to_id: null,
							line: null,
							path: "README.md",
							user: null,
						},
					]
				: [],
		);
		const runnerCalls: ObjectRunOptions<ImplementPr>[] = [];
		const runner = async (
			options: ObjectRunOptions<ImplementPr>,
		): Promise<RunAgentResult<ImplementPr>> => {
			runnerCalls.push(options);
			return fakeResult({ feedback: [], summary: "Reviewed." });
		};
		const exec: ExecFn = async (_command, args) =>
			args[0] === "merge-base"
				? { exitCode: 0, stderr: "", stdout: "abc123\n" }
				: args[0] === "rev-parse"
					? { exitCode: 0, stderr: "", stdout: "sha123\n" }
					: { exitCode: 0, stderr: "", stdout: "" };

		// Act
		await runImplementPr(ctx, runner, exec);

		// Assert
		expect(runnerCalls[0]?.promptArgs.REVIEW_THREADS).toContain(
			"[inline:9002] @unknown at **README.md:?**:",
		);
	});

	it.each([
		["stderr", "permission denied", "permission denied"],
		["stdout", "", "remote rejected"],
		["fallback", "", ""],
	])(
		"reports a %s command failure and blocks the stage",
		async (_label, stderr, stdout) => {
			// Arrange
			process.env.AGENT_PAT = "pat-token";
			const ctx = buildContext();
			vi.mocked(ctx.octokit.rest.pulls.get).mockResolvedValue({
				data: {
					body: "Closes #17",
					head: { ref: "agent/issue-17-fix-review" },
					labels: [],
				},
			} as unknown as Awaited<ReturnType<typeof ctx.octokit.rest.pulls.get>>);
			vi.mocked(ctx.octokit.rest.pulls.listReviewComments).mockResolvedValue({
				data: [],
			} as unknown as Awaited<
				ReturnType<typeof ctx.octokit.rest.pulls.listReviewComments>
			>);
			vi.mocked(ctx.octokit.rest.issues.get).mockResolvedValue({
				data: { body: "The originating ticket." },
			} as unknown as Awaited<ReturnType<typeof ctx.octokit.rest.issues.get>>);
			const runner = async (): Promise<RunAgentResult<ImplementPr>> =>
				fakeResult({ feedback: [], summary: "Fixed." });
			const exec: ExecFn = async (command, args) => {
				if (command === "git" && args[0] === "push") {
					return { exitCode: 1, stderr, stdout };
				}
				if (command === "git" && args[0] === "merge-base") {
					return { exitCode: 0, stderr: "", stdout: "abc123\n" };
				}
				return { exitCode: 0, stderr: "", stdout: "" };
			};

			// Act
			const act = runImplementPr(ctx, runner, exec);

			// Assert
			await expect(act).rejects.toThrow(stdout || stderr || "unknown error");
			expect(ctx.octokit.rest.issues.addLabels).toHaveBeenCalledWith(
				expect.objectContaining({ labels: [LABELS.agentInProgress] }),
			);
		},
	);

	it("wires its workflow environment into the default runner", async () => {
		// Arrange
		process.env.GITHUB_TOKEN = "fake-token";
		process.env.ISSUE_NUMBER = "42";
		process.env.AGENT_PAT = "pat-token";
		const ctx = buildContext();
		vi.mocked(ctx.octokit.rest.pulls.get).mockResolvedValue({
			data: {
				body: "Closes #17",
				head: { ref: "agent/issue-17-fix-review" },
				labels: [],
			},
		} as unknown as Awaited<ReturnType<typeof ctx.octokit.rest.pulls.get>>);
		vi.mocked(ctx.octokit.rest.pulls.listReviewComments).mockResolvedValue({
			data: [],
		} as unknown as Awaited<
			ReturnType<typeof ctx.octokit.rest.pulls.listReviewComments>
		>);
		vi.mocked(ctx.octokit.rest.issues.get).mockResolvedValue({
			data: { body: "The originating ticket." },
		} as unknown as Awaited<ReturnType<typeof ctx.octokit.rest.issues.get>>);
		vi.mocked(runAgent).mockResolvedValue(
			fakeResult({ feedback: [], summary: "Fixed." }),
		);
		vi.mocked((await import("../exec")).defaultExec).mockImplementation(
			async (_command, args) =>
				args[0] === "merge-base"
					? { exitCode: 0, stderr: "", stdout: "abc123\n" }
					: { exitCode: 0, stderr: "", stdout: "" },
		);

		// Act
		await implementPrRun();

		// Assert
		expect(github.getOctokit).toHaveBeenCalledWith("fake-token");
		expect(runAgent).toHaveBeenCalledWith(
			expect.objectContaining({ skills: ["implement"] }),
		);
	});
});
