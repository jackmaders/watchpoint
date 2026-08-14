import * as github from "@actions/github";
import { describe, expect, it, vi } from "vitest";
import type { IssueContext } from "../../github";
import type { ImplementPrFeedback } from "../../schemas";
import type { FeedbackSource } from "../comments";
import {
	formatResponseBody,
	postFeedbackResponses,
	postReviewReplies,
	sourceUrl,
} from "../replies";

vi.mock("@actions/github");

function createIssueContext(): IssueContext {
	return {
		issueNumber: 42,
		octokit: github.getOctokit("fake-token"),
		owner: "jackmaders",
		repo: "watchpoint",
	};
}

describe("sourceUrl", () => {
	it("constructs correct URLs for comment, review, and inline feedback sources", () => {
		// Arrange
		const ctx = createIssueContext();
		const commentSource: FeedbackSource = {
			kind: "comment",
			rawId: "123",
			replyTargetId: "123",
		};
		const reviewSource: FeedbackSource = {
			kind: "review",
			rawId: "456",
			replyTargetId: "456",
		};
		const inlineSource: FeedbackSource = {
			kind: "inline",
			rawId: "789",
			replyTargetId: "789",
		};

		// Act
		const commentUrl = sourceUrl(ctx, commentSource);
		const reviewUrl = sourceUrl(ctx, reviewSource);
		const inlineUrl = sourceUrl(ctx, inlineSource);

		// Assert
		expect(commentUrl).toBe(
			"https://github.com/jackmaders/watchpoint/pull/42#issuecomment-123",
		);
		expect(reviewUrl).toBe(
			"https://github.com/jackmaders/watchpoint/pull/42#pullrequestreview-456",
		);
		expect(inlineUrl).toBe(
			"https://github.com/jackmaders/watchpoint/pull/42#discussion_r789",
		);
	});
});

describe("formatResponseBody", () => {
	it("formats markdown response with bot comment marker and source link", () => {
		// Arrange
		const ctx = createIssueContext();
		const inlineSource: FeedbackSource = {
			kind: "inline",
			rawId: "789",
			replyTargetId: "789",
		};

		// Act
		const body = formatResponseBody(ctx, inlineSource, "Fixed in commit abc");

		// Assert
		expect(body).toBe(
			"<!-- bot-comment -->\nReplying to [inline review comment 789](https://github.com/jackmaders/watchpoint/pull/42#discussion_r789):\n\nFixed in commit abc",
		);
	});

	it("formats markdown response for review and top-level comment correctly", () => {
		// Arrange
		const ctx = createIssueContext();
		const commentSource: FeedbackSource = {
			kind: "comment",
			rawId: "101",
			replyTargetId: "101",
		};
		const reviewSource: FeedbackSource = {
			kind: "review",
			rawId: "202",
			replyTargetId: "202",
		};

		// Act
		const commentBody = formatResponseBody(ctx, commentSource, "Acknowledged");
		const reviewBody = formatResponseBody(
			ctx,
			reviewSource,
			"Addressed review",
		);

		// Assert
		expect(commentBody).toContain("Replying to [PR comment 101]");
		expect(reviewBody).toContain("Replying to [PR review 202]");
	});
});

describe("postFeedbackResponses", () => {
	it("posts structured replies via gh api for inline and issue comments", async () => {
		// Arrange
		const ctx = createIssueContext();
		const sources = new Map<string, FeedbackSource>([
			["inline:301", { kind: "inline", rawId: "301", replyTargetId: "300" }],
			["comment:101", { kind: "comment", rawId: "101", replyTargetId: "101" }],
		]);
		const feedback: ImplementPrFeedback[] = [
			{
				reason: "Typo fix",
				response: "Fixed the typo.",
				sourceId: "inline:301",
				status: "fixed",
			},
			{
				reason: "Description update",
				response: "Updated description.",
				sourceId: "comment:101",
				status: "fixed",
			},
		];
		const execCalls: { command: string; args: string[] }[] = [];
		const mockExec = vi.fn(async (command: string, args: string[]) => {
			execCalls.push({ args, command });
			return { exitCode: 0, stderr: "", stdout: "" };
		});

		// Act
		await postFeedbackResponses(feedback, sources, ctx, mockExec);

		// Assert
		expect(mockExec).toHaveBeenCalledTimes(2);
		expect(execCalls[0].args).toContain(
			"repos/{owner}/{repo}/pulls/comments/300/replies",
		);
		expect(execCalls[1].args).toContain(
			"repos/{owner}/{repo}/issues/42/comments",
		);
	});

	it("throws an error when feedback sourceId is not in sources map", async () => {
		// Arrange
		const ctx = createIssueContext();
		const sources = new Map<string, FeedbackSource>();
		const feedback: ImplementPrFeedback[] = [
			{
				reason: "Fix reason",
				response: "Fixed.",
				sourceId: "unknown:999",
				status: "fixed",
			},
		];
		const mockExec = vi.fn();

		// Act & Assert
		await expect(
			postFeedbackResponses(feedback, sources, ctx, mockExec),
		).rejects.toThrow(
			"Cannot reply to unknown feedback source id: unknown:999.",
		);
	});

	it("throws an error when gh api command fails with stderr", async () => {
		// Arrange
		const ctx = createIssueContext();
		const sources = new Map<string, FeedbackSource>([
			["comment:101", { kind: "comment", rawId: "101", replyTargetId: "101" }],
		]);
		const feedback: ImplementPrFeedback[] = [
			{
				reason: "Failed reason",
				response: "Failed response.",
				sourceId: "comment:101",
				status: "fixed",
			},
		];
		const mockExec = vi.fn().mockResolvedValue({
			exitCode: 1,
			stderr: "GitHub API error: Not Found",
			stdout: "",
		});

		// Act & Assert
		await expect(
			postFeedbackResponses(feedback, sources, ctx, mockExec),
		).rejects.toThrow("GitHub API error: Not Found");
	});

	it("falls back to stdout or unknown error when stderr is empty", async () => {
		// Arrange
		const ctx = createIssueContext();
		const sources = new Map<string, FeedbackSource>([
			["comment:101", { kind: "comment", rawId: "101", replyTargetId: "101" }],
		]);
		const feedback: ImplementPrFeedback[] = [
			{
				reason: "Failed reason",
				response: "Failed response.",
				sourceId: "comment:101",
				status: "fixed",
			},
		];
		const mockExecStdout = vi.fn().mockResolvedValue({
			exitCode: 1,
			stderr: "",
			stdout: "Error in stdout",
		});
		const mockExecUnknown = vi.fn().mockResolvedValue({
			exitCode: 1,
			stderr: "",
			stdout: "",
		});

		// Act & Assert
		await expect(
			postFeedbackResponses(feedback, sources, ctx, mockExecStdout),
		).rejects.toThrow("failed: Error in stdout");
		await expect(
			postFeedbackResponses(feedback, sources, ctx, mockExecUnknown),
		).rejects.toThrow("failed: unknown error");
	});
});

describe("postReviewReplies", () => {
	it("posts replies to review comments via gh api", async () => {
		// Arrange
		const replies = [
			{ body: "Addressed feedback.", commentId: "thread-123" },
			{ body: "Changed as suggested.", commentId: "thread-456" },
		];
		const execCalls: { command: string; args: string[] }[] = [];
		const mockExec = vi.fn(async (command: string, args: string[]) => {
			execCalls.push({ args, command });
			return { exitCode: 0, stderr: "", stdout: "" };
		});

		// Act
		await postReviewReplies(replies, mockExec);

		// Assert
		expect(mockExec).toHaveBeenCalledTimes(2);
		expect(execCalls[0].args).toContain(
			"repos/{owner}/{repo}/pulls/comments/thread-123/replies",
		);
		expect(execCalls[0].args).toContain("--field");
		expect(execCalls[0].args).toContain("body=Addressed feedback.");
		expect(execCalls[1].args).toContain(
			"repos/{owner}/{repo}/pulls/comments/thread-456/replies",
		);
		expect(execCalls[1].args).toContain("body=Changed as suggested.");
	});

	it("throws an error if gh api fails when posting review replies", async () => {
		// Arrange
		const replies = [{ body: "Addressed.", commentId: "thread-999" }];
		const mockExec = vi.fn().mockResolvedValue({
			exitCode: 1,
			stderr: "Failed to post reply",
			stdout: "",
		});

		// Act & Assert
		await expect(postReviewReplies(replies, mockExec)).rejects.toThrow(
			"gh api --method POST repos/{owner}/{repo}/pulls/comments/thread-999/replies",
		);
	});
});
