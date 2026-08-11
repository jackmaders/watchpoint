import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { ExecFn } from "../exec";
import { RunAgentError } from "../failure";
import type { IssueContext } from "../github";
import {
	buildReviewBody,
	buildReviewPayload,
	getReviewDiff,
	parseDiff,
	parseOriginatingIssueNumber,
	runReview,
	runReviewAxis,
} from "../review";
import type { ObjectRunOptions, RunAgentResult } from "../run-agent";
import { OUTPUTS, type Review } from "../schemas";

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
