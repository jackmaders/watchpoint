import { readFileSync } from "node:fs";
import * as github from "@actions/github";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ExecFn } from "../exec";
import { RunAgentError } from "../failure";
import { type IssueContext, LABELS } from "../github";
import {
	buildReviewBody,
	buildReviewPayload,
	commitReviewerImprovements,
	getReviewDiff,
	parseDiff,
	parseOriginatingIssueNumber,
	run as reviewRun,
	runReview,
	runReviewAxis,
} from "../review";
import type { ObjectRunOptions, RunAgentResult } from "../run-agent";
import { OUTPUTS, type Review } from "../schemas";

vi.mock("@actions/github");
vi.mock("../logger");

function buildReviewContext(
	options: {
		body?: string | null;
		labels?: string[];
		reviewComments?: unknown[];
		issueBody?: string | null;
		issueComments?: unknown[];
	} = {},
): IssueContext {
	return {
		issueNumber: 42,
		octokit: {
			paginate: vi.fn().mockResolvedValue(options.issueComments ?? []),
			rest: {
				issues: {
					addLabels: vi.fn().mockResolvedValue({}),
					createComment: vi.fn().mockResolvedValue({}),
					get: vi.fn().mockResolvedValue({
						data: { body: options.issueBody ?? "Issue context." },
					}),
					removeLabel: vi.fn().mockResolvedValue({}),
				},
				pulls: {
					get: vi.fn().mockResolvedValue({
						data: {
							body: options.body ?? "No issue link.",
							head: { ref: "feature/review" },
							labels: (options.labels ?? []).map((name) => ({ name })),
						},
					}),
					listReviewComments: vi
						.fn()
						.mockResolvedValue({ data: options.reviewComments ?? [] }),
				},
			},
		},
		owner: "jackmaders",
		repo: "watchpoint",
	} as unknown as IssueContext;
}

function buildReviewExec(
	calls: Array<{ command: string; args: string[] }>,
): ExecFn {
	return async (command, args) => {
		calls.push({ args, command });
		if (command === "git" && args[0] === "merge-base") {
			return { exitCode: 0, stderr: "", stdout: "abc123\n" };
		}
		if (command === "git" && args[0] === "diff") {
			return {
				exitCode: 0,
				stderr: "",
				stdout: [
					"diff --git a/src/example.ts b/src/example.ts",
					"--- a/src/example.ts",
					"+++ b/src/example.ts",
					"@@ -1,0 +1,1 @@",
					"+export const answer = 42;",
				].join("\n"),
			};
		}
		return { exitCode: 0, stderr: "", stdout: "" };
	};
}

describe("parseDiff", () => {
	it("maps right-side context and added lines to their file paths", () => {
		// Arrange
		const diff = [
			"diff --git a/src/example.ts b/src/example.ts",
			"--- a/src/example.ts",
			"+++ b/src/example.ts",
			"@@ -10,3 +10,4 @@",
			" context",
			"+added",
			" context after",
		].join("\n");

		// Act
		const lines = parseDiff(diff);

		// Assert
		expect(lines).toEqual(
			new Set(["src/example.ts:10", "src/example.ts:11", "src/example.ts:12"]),
		);
	});

	it("does not map deleted lines and keeps separate file hunks distinct", () => {
		// Arrange
		const diff = [
			"diff --git a/old.ts b/old.ts",
			"--- a/old.ts",
			"+++ b/old.ts",
			"@@ -1,2 +1,1 @@",
			"-deleted",
			"+replacement",
			"diff --git a/new.ts b/new.ts",
			"--- /dev/null",
			"+++ b/new.ts",
			"@@ -0,0 +1,1 @@",
			"+new line",
		].join("\n");

		// Act
		const lines = parseDiff(diff);

		// Assert
		expect(lines).toEqual(new Set(["old.ts:1", "new.ts:1"]));
	});

	it("ignores no-newline markers and advances over unclassified diff lines", () => {
		// Arrange
		const diff = [
			"diff --git a/removed.ts b/removed.ts",
			"+++ /dev/null",
			"@@ malformed hunk header",
			"+ignored",
			"diff --git a/kept.ts b/kept.ts",
			"+++ b/kept.ts",
			"@@ -1 +7,2 @@",
			"+added",
			"\\ No newline at end of file",
			"~metadata",
			" context",
		].join("\n");

		// Act
		const lines = parseDiff(diff);

		// Assert
		expect(lines).toEqual(new Set(["kept.ts:7", "kept.ts:9"]));
	});
});

describe("getReviewDiff", () => {
	it("fetches main, diffs from its merge-base, and returns valid comment lines", async () => {
		// Arrange
		const calls: Array<{ command: string; args: string[] }> = [];
		const exec: ExecFn = async (command, args) => {
			calls.push({ args, command });
			if (args[0] === "merge-base") {
				return { exitCode: 0, stderr: "", stdout: "abc123\n" };
			}
			return {
				exitCode: 0,
				stderr: "",
				stdout: [
					"diff --git a/src/example.ts b/src/example.ts",
					"--- a/src/example.ts",
					"+++ b/src/example.ts",
					"@@ -1,0 +1,1 @@",
					"+export const answer = 42;",
				].join("\n"),
			};
		};

		// Act
		const result = await getReviewDiff(exec);

		// Assert
		expect(calls).toEqual([
			{ args: ["fetch", "origin", "main"], command: "git" },
			{ args: ["merge-base", "origin/main", "HEAD"], command: "git" },
			{ args: ["diff", "abc123", "HEAD"], command: "git" },
		]);
		expect(result.diff).toContain("answer = 42");
		expect(result.validLines).toEqual(new Set(["src/example.ts:1"]));
	});

	it("throws the command error when the merge-base cannot be resolved", async () => {
		// Arrange
		const exec: ExecFn = async (_command, args) =>
			args[0] === "fetch"
				? { exitCode: 0, stderr: "", stdout: "" }
				: {
						exitCode: 1,
						stderr: "fatal: no common ancestor",
						stdout: "",
					};

		// Act
		const result = getReviewDiff(exec);

		// Assert
		await expect(result).rejects.toThrow(
			"git merge-base origin/main HEAD failed",
		);
	});

	it("rejects an empty merge-base even when git exits successfully", async () => {
		// Arrange
		const exec: ExecFn = async (_command, args) =>
			args[0] === "merge-base"
				? { exitCode: 0, stderr: "", stdout: " \n" }
				: { exitCode: 0, stderr: "", stdout: "" };

		// Act
		const result = getReviewDiff(exec);

		// Assert
		await expect(result).rejects.toThrow("empty merge-base");
	});

	it("uses an unknown-error message when a git command has no stderr", async () => {
		// Arrange
		const exec: ExecFn = async () => ({
			exitCode: 1,
			stderr: "",
			stdout: "",
		});

		// Act
		const result = getReviewDiff(exec);

		// Assert
		await expect(result).rejects.toThrow("unknown error");
	});
});

describe("runReviewAxis", () => {
	it("retries a quota failure once with the configured fallback model", async () => {
		// Arrange
		const calls: ObjectRunOptions<Review>[] = [];
		const output: Review = {
			inlineComments: [],
			replies: [],
			summary: "Reviewed.",
			verdict: "approved",
		};
		const result = { output } as RunAgentResult<Review>;
		const runner = async (
			options: ObjectRunOptions<Review>,
		): Promise<RunAgentResult<Review>> => {
			calls.push(options);
			if (calls.length === 1) {
				throw new RunAgentError("quota", "rate limit reached");
			}
			return result;
		};
		const options: ObjectRunOptions<Review> = {
			output: OUTPUTS["review-standards"],
			promptArgs: {},
			promptFile: "review.md",
		};

		// Act
		const review = await runReviewAxis(options, runner);

		// Assert
		expect(review).toBe(output);
		expect(calls).toHaveLength(2);
		expect(calls[1].model).toEqual({
			model: "gpt-5.4",
			provider: "openai",
		});
	});

	it("does not retry non-quota failures", async () => {
		// Arrange
		const runner = async (): Promise<RunAgentResult<Review>> => {
			throw new RunAgentError("timeout", "timed out");
		};
		const options: ObjectRunOptions<Review> = {
			output: OUTPUTS["review-spec"],
			promptArgs: {},
			promptFile: "review.md",
		};

		// Act
		const result = runReviewAxis(options, runner);

		// Assert
		await expect(result).rejects.toThrow("timed out");
	});
});

describe("runReview", () => {
	it("runs both axes, filters comments, and posts one side-by-side review", async () => {
		// Arrange
		const runnerCalls: ObjectRunOptions<Review>[] = [];
		const execCalls: Array<{ command: string; args: string[] }> = [];
		const output: Review = {
			inlineComments: [
				{ body: "Valid finding.", line: 1, path: "src/example.ts" },
				{ body: "Dropped finding.", line: 99, path: "src/example.ts" },
			],
			replies: [],
			summary: "Reviewed independently.",
			verdict: "approved",
		};
		const runner = async (
			options: ObjectRunOptions<Review>,
		): Promise<RunAgentResult<Review>> => {
			runnerCalls.push(options);
			return { output } as RunAgentResult<Review>;
		};
		const exec: ExecFn = async (command, args) => {
			execCalls.push({ args, command });
			if (command === "git" && args[0] === "merge-base") {
				return { exitCode: 0, stderr: "", stdout: "abc123\n" };
			}
			if (command === "git" && args[0] === "diff") {
				return {
					exitCode: 0,
					stderr: "",
					stdout: [
						"diff --git a/src/example.ts b/src/example.ts",
						"--- a/src/example.ts",
						"+++ b/src/example.ts",
						"@@ -1,0 +1,1 @@",
						"+export const answer = 42;",
					].join("\n"),
				};
			}
			return { exitCode: 0, stderr: "", stdout: "" };
		};
		const ctx = {
			issueNumber: 42,
			octokit: {
				rest: {
					issues: {
						addLabels: vi.fn().mockResolvedValue({}),
						createComment: vi.fn().mockResolvedValue({}),
						removeLabel: vi.fn().mockResolvedValue({}),
					},
					pulls: {
						get: vi.fn().mockResolvedValue({
							data: {
								body: "No issue link.",
								head: { ref: "feature/review" },
								labels: [],
							},
						}),
						listReviewComments: vi.fn().mockResolvedValue({ data: [] }),
					},
				},
			},
			owner: "jackmaders",
			repo: "watchpoint",
		} as unknown as IssueContext;

		// Act
		await runReview(ctx, runner, exec);

		// Assert
		expect(runnerCalls).toHaveLength(2);
		expect(runnerCalls.map((call) => call.output)).toEqual([
			OUTPUTS["review-standards"],
			OUTPUTS["review-spec"],
		]);
		expect(
			runnerCalls.every((call) => call.skills?.includes("code-review")),
		).toBe(true);
		expect(execCalls).toContainEqual({
			args: expect.arrayContaining([
				"api",
				"--method",
				"POST",
				"repos/{owner}/{repo}/pulls/42/reviews",
			]),
			command: "gh",
		});
		expect(execCalls).toContainEqual({
			args: ["pr", "ready", "42", "--repo", "jackmaders/watchpoint"],
			command: "gh",
		});
		const payloadCall = execCalls.find((call) =>
			call.args.includes("repos/{owner}/{repo}/pulls/42/reviews"),
		);
		const payloadPath = payloadCall?.args.at(-1);
		expect(payloadPath).toBeDefined();
		expect(readFileSync(payloadPath as string, "utf-8")).toContain(
			"1 posted, 1 dropped",
		);
	});

	it("marks a first-round changes request for implementation", async () => {
		// Arrange
		Reflect.deleteProperty(process.env, "AGENT_PAT");
		const output: Review = {
			inlineComments: [],
			replies: [],
			summary: "Blocking findings.",
			verdict: "changes-requested",
		};
		const runner = async (): Promise<RunAgentResult<Review>> => ({
			output,
			raw: "",
			sessionId: "session-1",
			usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
		});
		const exec: ExecFn = async (_command, args) => {
			if (args[0] === "merge-base") {
				return { exitCode: 0, stderr: "", stdout: "abc123\n" };
			}
			if (args[0] === "diff") {
				return {
					exitCode: 0,
					stderr: "",
					stdout: [
						"diff --git a/src/example.ts b/src/example.ts",
						"--- a/src/example.ts",
						"+++ b/src/example.ts",
						"@@ -1,0 +1,1 @@",
						"+export const answer = 42;",
					].join("\n"),
				};
			}
			return { exitCode: 0, stderr: "", stdout: "" };
		};
		const ctx = {
			issueNumber: 42,
			octokit: {
				rest: {
					issues: {
						addLabels: vi.fn().mockResolvedValue({}),
						createComment: vi.fn().mockResolvedValue({}),
						removeLabel: vi.fn().mockResolvedValue({}),
					},
					pulls: {
						get: vi.fn().mockResolvedValue({
							data: {
								body: "No issue link.",
								head: { ref: "feature/review" },
								labels: [],
							},
						}),
						listReviewComments: vi.fn().mockResolvedValue({ data: [] }),
					},
				},
			},
			owner: "jackmaders",
			repo: "watchpoint",
		} as unknown as IssueContext;

		// Act
		await runReview(ctx, runner, exec);

		// Assert
		expect(ctx.octokit.rest.issues.addLabels).toHaveBeenCalledWith({
			issue_number: 42,
			labels: [LABELS.reviewRound1],
			owner: "jackmaders",
			repo: "watchpoint",
		});
	});

	it("escalates a second-round changes request", async () => {
		// Arrange
		Reflect.deleteProperty(process.env, "AGENT_PAT");
		const output: Review = {
			inlineComments: [],
			replies: [],
			summary: "Still blocking.",
			verdict: "changes-requested",
		};
		const runner = async (): Promise<RunAgentResult<Review>> => ({
			output,
			raw: "",
			sessionId: "session-2",
			usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
		});
		const exec: ExecFn = async (_command, args) => {
			if (args[0] === "merge-base") {
				return { exitCode: 0, stderr: "", stdout: "abc123\n" };
			}
			if (args[0] === "diff") {
				return {
					exitCode: 0,
					stderr: "",
					stdout: [
						"diff --git a/src/example.ts b/src/example.ts",
						"--- a/src/example.ts",
						"+++ b/src/example.ts",
						"@@ -1,0 +1,1 @@",
						"+export const answer = 42;",
					].join("\n"),
				};
			}
			return { exitCode: 0, stderr: "", stdout: "" };
		};
		const ctx = {
			issueNumber: 42,
			octokit: {
				rest: {
					issues: {
						addLabels: vi.fn().mockResolvedValue({}),
						createComment: vi.fn().mockResolvedValue({}),
						removeLabel: vi.fn().mockResolvedValue({}),
					},
					pulls: {
						get: vi.fn().mockResolvedValue({
							data: {
								body: "No issue link.",
								head: { ref: "feature/review" },
								labels: [
									{ name: LABELS.reviewRound1 },
									{ name: LABELS.devNeeded },
								],
							},
						}),
						listReviewComments: vi.fn().mockResolvedValue({ data: [] }),
					},
				},
			},
			owner: "jackmaders",
			repo: "watchpoint",
		} as unknown as IssueContext;

		// Act
		await runReview(ctx, runner, exec);

		// Assert
		expect(ctx.octokit.rest.issues.addLabels).toHaveBeenCalledWith({
			issue_number: 42,
			labels: [LABELS.reviewRound2, LABELS.reviewEscalated],
			owner: "jackmaders",
			repo: "watchpoint",
		});
		expect(ctx.octokit.rest.issues.removeLabel).toHaveBeenCalledWith({
			issue_number: 42,
			name: LABELS.devNeeded,
			owner: "jackmaders",
			repo: "watchpoint",
		});
	});

	it("includes existing threads, issue context, and replies in the review", async () => {
		// Arrange
		const runnerCalls: ObjectRunOptions<Review>[] = [];
		const output: Review = {
			inlineComments: [],
			replies: [{ body: "Thread reply", commentId: "comment-1" }],
			summary: "Reviewed.",
			verdict: "approved",
		};
		const runner = async (
			options: ObjectRunOptions<Review>,
		): Promise<RunAgentResult<Review>> => {
			runnerCalls.push(options);
			return {
				output,
				raw: "",
				sessionId: "session-3",
				usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
			};
		};
		const ctx = buildReviewContext({
			body: "Fixes #17",
			issueComments: [
				{ body: "User detail.", user: { type: "User" } },
				{ body: "Bot detail.", user: { type: "Bot" } },
			],
			reviewComments: [
				{
					body: "Please revisit.",
					line: 1,
					path: "src/example.ts",
					user: { login: "reviewer" },
				},
				{ body: null, line: null, path: "README.md", user: null },
			],
		});
		const execCalls: Array<{ command: string; args: string[] }> = [];
		const exec = buildReviewExec(execCalls);

		// Act
		await runReview(ctx, runner, exec);

		// Assert
		expect(runnerCalls).toHaveLength(2);
		expect(runnerCalls[0]?.promptArgs.UNRESOLVED_THREADS).toContain(
			"src/example.ts:1",
		);
		expect(runnerCalls[1]?.promptArgs.SPEC_CONTEXT).toContain("Issue context.");
		expect(execCalls).toContainEqual({
			args: [
				"api",
				"--method",
				"POST",
				"repos/{owner}/{repo}/pulls/comments/comment-1/replies",
				"--field",
				"body=Thread reply",
			],
			command: "gh",
		});
	});

	it("continues with fallback context when GitHub context lookups fail", async () => {
		// Arrange
		const runnerCalls: ObjectRunOptions<Review>[] = [];
		const output: Review = {
			inlineComments: [],
			replies: [],
			summary: "Reviewed.",
			verdict: "approved",
		};
		const runner = async (
			options: ObjectRunOptions<Review>,
		): Promise<RunAgentResult<Review>> => {
			runnerCalls.push(options);
			return {
				output,
				raw: "",
				sessionId: "session-4",
				usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
			};
		};
		const ctx = buildReviewContext({ body: "Closes #17" });
		vi.mocked(ctx.octokit.rest.pulls.listReviewComments).mockRejectedValue(
			new Error("threads unavailable"),
		);
		vi.mocked(ctx.octokit.rest.issues.get).mockRejectedValue(
			new Error("issue unavailable"),
		);
		const exec = buildReviewExec([]);

		// Act
		await runReview(ctx, runner, exec);

		// Assert
		expect(runnerCalls[0]?.promptArgs.UNRESOLVED_THREADS).toBe(
			"Could not fetch existing review threads.",
		);
		expect(runnerCalls[1]?.promptArgs.SPEC_CONTEXT).toBe(
			"Could not fetch originating issue context.",
		);
	});
});

describe("runReview PAT chaining", () => {
	const originalPat = process.env.AGENT_PAT;

	beforeEach(() => {
		vi.clearAllMocks();
		process.env.AGENT_PAT = "pat-token";
	});

	afterEach(() => {
		if (originalPat === undefined) {
			Reflect.deleteProperty(process.env, "AGENT_PAT");
		} else {
			process.env.AGENT_PAT = originalPat;
		}
	});

	it("uses the PAT client when round-one findings chain dev:needed", async () => {
		// Arrange
		const output: Review = {
			inlineComments: [],
			replies: [],
			summary: "Blocking finding.",
			verdict: "changes-requested",
		};
		const runner = async (): Promise<RunAgentResult<Review>> => ({
			output,
			raw: "",
			sessionId: "session-pat",
			usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
		});
		const ctx = buildReviewContext();
		const exec = buildReviewExec([]);

		// Act
		await runReview(ctx, runner, exec);

		// Assert
		expect(github.getOctokit).toHaveBeenCalledWith("pat-token");
	});
});

describe("runReview without a PAT", () => {
	const originalPat = process.env.AGENT_PAT;

	afterEach(() => {
		if (originalPat === undefined) {
			Reflect.deleteProperty(process.env, "AGENT_PAT");
		} else {
			process.env.AGENT_PAT = originalPat;
		}
	});

	it("does not apply the chaining label with GITHUB_TOKEN", async () => {
		// Arrange
		Reflect.deleteProperty(process.env, "AGENT_PAT");
		const output: Review = {
			inlineComments: [],
			replies: [],
			summary: "Blocking finding.",
			verdict: "changes-requested",
		};
		const runner = async (): Promise<RunAgentResult<Review>> => ({
			output,
			raw: "",
			sessionId: "session-no-pat",
			usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
		});
		const ctx = buildReviewContext();
		const exec = buildReviewExec([]);

		// Act
		await runReview(ctx, runner, exec);

		// Assert
		expect(ctx.octokit.rest.issues.addLabels).toHaveBeenCalledWith(
			expect.objectContaining({ labels: [LABELS.reviewRound1] }),
		);
		expect(ctx.octokit.rest.issues.addLabels).not.toHaveBeenCalledWith(
			expect.objectContaining({
				labels: expect.arrayContaining([LABELS.devNeeded]),
			}),
		);
		expect(ctx.octokit.rest.issues.createComment).toHaveBeenCalledWith(
			expect.objectContaining({ body: expect.stringContaining("AGENT_PAT") }),
		);
	});
});

describe("run", () => {
	const originalEnv = { ...process.env };

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		process.env = { ...originalEnv };
	});

	it("escalates a second-round review when wired from the workflow environment", async () => {
		// Arrange
		process.env.GITHUB_TOKEN = "fake-token";
		process.env.ISSUE_NUMBER = "42";
		const octokit = github.getOctokit("fake-token");
		vi.mocked(octokit.rest.pulls.get).mockResolvedValueOnce({
			data: {
				body: "No issue link.",
				head: { ref: "feature/review" },
				labels: [{ name: LABELS.reviewRound2 }, { name: LABELS.reviewNeeded }],
			},
		} as unknown as Awaited<ReturnType<typeof octokit.rest.pulls.get>>);

		// Act
		await reviewRun();

		// Assert
		expect(github.getOctokit).toHaveBeenCalledWith("fake-token");
		expect(octokit.rest.issues.createComment).toHaveBeenCalledWith({
			body: expect.stringContaining("Review Escalated"),
			issue_number: 42,
			owner: "jackmaders",
			repo: "watchpoint",
		});
		expect(octokit.rest.issues.removeLabel).toHaveBeenCalledWith({
			issue_number: 42,
			name: LABELS.reviewNeeded,
			owner: "jackmaders",
			repo: "watchpoint",
		});
		expect(octokit.rest.issues.addLabels).toHaveBeenCalledWith({
			issue_number: 42,
			labels: [LABELS.reviewEscalated],
			owner: "jackmaders",
			repo: "watchpoint",
		});
	});
});

describe("commitReviewerImprovements", () => {
	it("commits and pushes dirty reviewer changes as one conventional commit", async () => {
		// Arrange
		const calls: Array<{ command: string; args: string[] }> = [];
		const exec: ExecFn = async (command, args) => {
			calls.push({ args, command });
			return {
				exitCode: 0,
				stderr: "",
				stdout: args[0] === "status" ? " M src/review.ts\n" : "",
			};
		};

		// Act
		const committed = await commitReviewerImprovements(exec);

		// Assert
		expect(committed).toBe(true);
		expect(calls).toEqual([
			{ args: ["status", "--porcelain"], command: "git" },
			{ args: ["add", "-A"], command: "git" },
			{
				args: [
					"commit",
					"-m",
					"chore(review): 📝 apply automated reviewer improvements",
				],
				command: "git",
			},
			{ args: ["push", "origin", "HEAD"], command: "git" },
		]);
	});
});

describe("parseOriginatingIssueNumber", () => {
	it("prefers a closing issue reference in the pull request body", () => {
		// Arrange
		const body = "Closes #42\n\nThis is the change.";

		// Act
		const issueNumber = parseOriginatingIssueNumber(
			body,
			"agent/issue-99-other",
		);

		// Assert
		expect(issueNumber).toBe(42);
	});

	it("falls back to the issue number in an agent branch", () => {
		// Arrange

		// Act
		const issueNumber = parseOriginatingIssueNumber(
			"No closing reference.",
			"agent/issue-99-two-axis-review",
		);

		// Assert
		expect(issueNumber).toBe(99);
	});

	it("returns null when no originating issue can be found", () => {
		// Arrange

		// Act
		const issueNumber = parseOriginatingIssueNumber(null, "feature/review");

		// Assert
		expect(issueNumber).toBeNull();
	});
});

describe("review composition", () => {
	function review(overrides: Partial<Review> = {}): Review {
		return {
			inlineComments: [],
			replies: [],
			summary: "No findings.",
			verdict: "approved",
			...overrides,
		};
	}

	it("keeps Standards and Spec reports under separate headings with drop counts", () => {
		// Arrange
		const standards = review({ summary: "Standards summary." });
		const spec = review({ summary: "Spec summary." });

		// Act
		const body = buildReviewBody(standards, 2, spec, 1);

		// Assert
		expect(body).toBe(
			"## Standards Review\n\n**Verdict:** approved\nStandards summary.\n\n*Inline comments: 0 posted, 2 dropped.*\n\n## Spec Review\n\n**Verdict:** approved\nSpec summary.\n\n*Inline comments: 0 posted, 1 dropped.*",
		);
	});

	it("requests changes when either independent axis requests changes", () => {
		// Arrange
		const standards = review();
		const spec = review({ verdict: "changes-requested" });

		// Act
		const payload = buildReviewPayload("Review body.", standards, spec);

		// Assert
		expect(payload.event).toBe("REQUEST_CHANGES");
		expect(payload.body).toBe("Review body.");
	});
});
