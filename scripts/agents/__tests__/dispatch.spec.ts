import * as github from "@actions/github";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { dispatchPing, isBotComment, matchesPingCommand } from "../dispatch";
import { BOT_COMMENT_MARKER } from "../github";
import type { RunAgentResult } from "../run-agent";

vi.mock("@actions/github");

describe("matchesPingCommand", () => {
	it("matches a comment that is exactly the command", () => {
		// Arrange
		const commentBody = "/ping";

		// Act
		const matched = matchesPingCommand(commentBody);

		// Assert
		expect(matched).toBe(true);
	});

	it("matches the command at the start of any line, not just the string", () => {
		// Arrange
		const commentBody = "hey team\n/ping\nany updates?";

		// Act
		const matched = matchesPingCommand(commentBody);

		// Assert
		expect(matched).toBe(true);
	});

	it("does not match the command mentioned mid-line — the F6 bug this regex avoids", () => {
		// Arrange
		const commentBody = "can someone run /ping for me?";

		// Act
		const matched = matchesPingCommand(commentBody);

		// Assert
		expect(matched).toBe(false);
	});

	it("does not match an unrelated command", () => {
		// Arrange
		const commentBody = "/spec";

		// Act
		const matched = matchesPingCommand(commentBody);

		// Assert
		expect(matched).toBe(false);
	});
});

describe("isBotComment", () => {
	it("identifies a comment carrying the bot marker", () => {
		// Arrange
		const commentBody = `${BOT_COMMENT_MARKER}\n/ping`;

		// Act
		const result = isBotComment(commentBody);

		// Assert
		expect(result).toBe(true);
	});

	it("identifies a comment with no bot marker as human-authored", () => {
		// Arrange
		const commentBody = "/ping";

		// Act
		const result = isBotComment(commentBody);

		// Assert
		expect(result).toBe(false);
	});
});

describe("dispatchPing", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("does nothing for a comment carrying the bot marker", async () => {
		// Arrange
		const octokit = github.getOctokit("fake-token");
		const ctx = {
			issueNumber: 42,
			octokit,
			owner: "jackmaders",
			repo: "watchpoint",
		};
		const run = vi.fn();

		// Act
		await dispatchPing(ctx, `${BOT_COMMENT_MARKER}\n/ping`, run);

		// Assert
		expect(run).not.toHaveBeenCalled();
		expect(octokit.rest.issues.createComment).not.toHaveBeenCalled();
	});

	it("does nothing for a comment that does not match /ping", async () => {
		// Arrange
		const octokit = github.getOctokit("fake-token");
		const ctx = {
			issueNumber: 42,
			octokit,
			owner: "jackmaders",
			repo: "watchpoint",
		};
		const run = vi.fn();

		// Act
		await dispatchPing(ctx, "just chatting", run);

		// Assert
		expect(run).not.toHaveBeenCalled();
		expect(octokit.rest.issues.createComment).not.toHaveBeenCalled();
	});

	it("runs the ping stage's model against the gemini CLI and posts a marked reply", async () => {
		// Arrange
		const octokit = github.getOctokit("fake-token");
		const ctx = {
			issueNumber: 42,
			octokit,
			owner: "jackmaders",
			repo: "watchpoint",
		};
		const run = vi.fn<() => Promise<RunAgentResult>>().mockResolvedValue({
			events: [],
			raw: "",
			sessionId: "sess_1",
			text: "🏓 pong — I'm online and ready.",
		});

		// Act
		await dispatchPing(ctx, "/ping", run);

		// Assert
		expect(run).toHaveBeenCalledWith(
			expect.objectContaining({ cli: "gemini", model: "flash" }),
		);
		expect(octokit.rest.issues.createComment).toHaveBeenCalledWith({
			body: `${BOT_COMMENT_MARKER}\n🏓 pong — I'm online and ready.`,
			issue_number: 42,
			owner: "jackmaders",
			repo: "watchpoint",
		});
	});

	it("posts an error comment when the agent run fails", async () => {
		// Arrange
		const octokit = github.getOctokit("fake-token");
		const ctx = {
			issueNumber: 42,
			octokit,
			owner: "jackmaders",
			repo: "watchpoint",
		};
		const run = vi.fn().mockRejectedValue(new Error("quota exceeded"));

		// Act
		await dispatchPing(ctx, "/ping", run);

		// Assert
		expect(octokit.rest.issues.createComment).toHaveBeenCalledWith({
			body: expect.stringContaining("quota exceeded"),
			issue_number: 42,
			owner: "jackmaders",
			repo: "watchpoint",
		});
	});
});
