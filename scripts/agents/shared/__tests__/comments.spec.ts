import * as github from "@actions/github";
import { describe, expect, it, vi } from "vitest";
import type { IssueContext } from "../../github";
import {
	fetchReviewFeedback,
	fetchReviewThreads,
	normalizeCommentId,
} from "../comments";

vi.mock("@actions/github");
vi.mock("../../logger");

function createIssueContext(): IssueContext {
	return {
		issueNumber: 42,
		octokit: github.getOctokit("fake-token"),
		owner: "jackmaders",
		repo: "watchpoint",
	};
}

describe("normalizeCommentId", () => {
	it("formats source id with kind and raw id", () => {
		// Arrange
		const kind = "comment";
		const id = 123;

		// Act
		const normalized = normalizeCommentId(kind, id);

		// Assert
		expect(normalized).toBe("comment:123");
	});
});

describe("fetchReviewFeedback", () => {
	it("returns fallback message when no feedback exists", async () => {
		// Arrange
		const ctx = createIssueContext();
		vi.mocked(ctx.octokit.paginate).mockResolvedValue([]);

		// Act
		const result = await fetchReviewFeedback(ctx);

		// Assert
		expect(result.conversation).toBe("No existing PR feedback.");
		expect(result.sources.size).toBe(0);
	});

	it("fetches paginated top-level, review, and inline comments and normalizes source IDs", async () => {
		// Arrange
		const ctx = createIssueContext();
		vi.mocked(ctx.octokit.paginate).mockImplementation(
			async (endpoint: unknown) => {
				if (endpoint === ctx.octokit.rest.issues.listComments) {
					return [
						{
							body: "Great work!",
							id: 101,
							user: { login: "alice" },
						},
						{
							body: null,
							id: 102,
							user: null,
						},
						{
							body: undefined,
							id: 103,
							user: { login: undefined },
						},
					];
				}
				if (endpoint === ctx.octokit.rest.pulls.listReviews) {
					return [
						{
							body: "LGTM overall",
							id: 201,
							state: "APPROVED",
							user: { login: "bob" },
						},
						{
							body: null,
							id: 202,
							state: null,
							user: null,
						},
						{
							body: undefined,
							id: 203,
							state: undefined,
							user: { login: undefined },
						},
					];
				}
				if (endpoint === ctx.octokit.rest.pulls.listReviewComments) {
					return [
						{
							body: "Consider renaming this",
							id: 301,
							in_reply_to_id: 300,
							line: 45,
							path: "src/index.ts",
							user: { login: "charlie" },
						},
						{
							body: null,
							id: 302,
							in_reply_to_id: null,
							line: null,
							path: null,
							user: null,
						},
						{
							body: undefined,
							id: 303,
							in_reply_to_id: undefined,
							line: undefined,
							path: undefined,
							user: { login: undefined },
						},
					];
				}
				return [];
			},
		);

		// Act
		const result = await fetchReviewFeedback(ctx);

		// Assert
		expect(result.sources.size).toBe(9);
		expect(result.sources.get("comment:101")).toEqual({
			kind: "comment",
			rawId: "101",
			replyTargetId: "101",
		});
		expect(result.sources.get("review:201")).toEqual({
			kind: "review",
			rawId: "201",
			replyTargetId: "201",
		});
		expect(result.sources.get("inline:301")).toEqual({
			kind: "inline",
			rawId: "301",
			replyTargetId: "300",
		});
		expect(result.sources.get("inline:302")).toEqual({
			kind: "inline",
			rawId: "302",
			replyTargetId: "302",
		});
		expect(result.conversation).toContain("Top-level PR comments:");
		expect(result.conversation).toContain(
			"- [comment:101] @alice: Great work!",
		);
		expect(result.conversation).toContain("- [comment:102] @unknown: ");
		expect(result.conversation).toContain("PR review bodies:");
		expect(result.conversation).toContain(
			"- [review:201] @bob (APPROVED): LGTM overall",
		);
		expect(result.conversation).toContain(
			"- [review:202] @unknown (unknown): ",
		);
		expect(result.conversation).toContain("Inline PR review comments:");
		expect(result.conversation).toContain(
			"- [inline:301] @charlie at **src/index.ts:45**: Consider renaming this",
		);
		expect(result.conversation).toContain(
			"- [inline:302] @unknown at **?:?**: ",
		);
	});
});

describe("fetchReviewThreads", () => {
	it("returns fallback message when no review comments exist", async () => {
		// Arrange
		const ctx = createIssueContext();
		vi.mocked(ctx.octokit.rest.pulls.listReviewComments).mockResolvedValue({
			data: [],
		} as unknown as Awaited<
			ReturnType<typeof ctx.octokit.rest.pulls.listReviewComments>
		>);

		// Act
		const result = await fetchReviewThreads(ctx);

		// Assert
		expect(result).toBe("No existing review threads.");
	});

	it("formats existing review comments with path, line, user, and body", async () => {
		// Arrange
		const ctx = createIssueContext();
		vi.mocked(ctx.octokit.rest.pulls.listReviewComments).mockResolvedValue({
			data: [
				{
					body: "Missing check",
					line: 12,
					path: "src/agent.ts",
					user: { login: "alice" },
				},
				{
					body: null,
					line: null,
					path: null,
					user: null,
				},
				{
					body: undefined,
					line: undefined,
					path: undefined,
					user: { login: undefined },
				},
			],
		} as unknown as Awaited<
			ReturnType<typeof ctx.octokit.rest.pulls.listReviewComments>
		>);

		// Act
		const result = await fetchReviewThreads(ctx);

		// Assert
		expect(result).toBe(
			"- **src/agent.ts:12** (alice): Missing check\n- **?:?** (unknown): \n- **?:?** (unknown): ",
		);
	});

	it("returns fallback message when octokit listReviewComments throws an error", async () => {
		// Arrange
		const ctx = createIssueContext();
		vi.mocked(ctx.octokit.rest.pulls.listReviewComments).mockRejectedValue(
			new Error("Rate limit exceeded"),
		);

		// Act
		const result = await fetchReviewThreads(ctx);

		// Assert
		expect(result).toBe("Could not fetch existing review threads.");
	});
});
