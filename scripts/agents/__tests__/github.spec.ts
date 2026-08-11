import * as github from "@actions/github";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	BOT_COMMENT_MARKER,
	extractLabelNames,
	fetchIssueContext,
	formatGeminiError,
	hasStatus,
	isBotComment,
	issueContextFromEnv,
	LABELS,
	LabelSchema,
	postBotComment,
	postIssueErrorComment,
	removeLabelIfPresent,
	resolvePatOctokit,
	resolveRunUrl,
	transitionState,
} from "../github";

vi.mock("@actions/github");
vi.mock("../logger");

describe("github helpers", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("constants", () => {
		it("defines the bot comment marker", () => {
			// Arrange
			// Act
			// Assert
			expect(BOT_COMMENT_MARKER).toBe("<!-- bot-comment -->");
		});
	});

	describe("isBotComment", () => {
		it("recognizes a comment carrying the bot marker", () => {
			// Arrange
			const commentBody = "<!-- bot-comment -->\nSome round.";

			// Act
			const result = isBotComment(commentBody);

			// Assert
			expect(result).toBe(true);
		});

		it("does not mistake an ordinary human comment for a bot one", () => {
			// Arrange
			const commentBody = "1 yes, 2 no because reasons.";

			// Act
			const result = isBotComment(commentBody);

			// Assert
			expect(result).toBe(false);
		});
	});

	describe("resolveRunUrl", () => {
		const originalEnv = { ...process.env };

		afterEach(() => {
			process.env = { ...originalEnv };
		});

		it("builds the run URL from the ambient GitHub Actions env vars", () => {
			// Arrange
			process.env.GITHUB_SERVER_URL = "https://github.com";
			process.env.GITHUB_REPOSITORY = "jackmaders/watchpoint";
			process.env.GITHUB_RUN_ID = "123";

			// Act
			const url = resolveRunUrl();

			// Assert
			expect(url).toBe(
				"https://github.com/jackmaders/watchpoint/actions/runs/123",
			);
		});

		it("returns null when any of the three env vars is missing", () => {
			// Arrange
			process.env.GITHUB_SERVER_URL = "https://github.com";
			process.env.GITHUB_REPOSITORY = "jackmaders/watchpoint";
			Reflect.deleteProperty(process.env, "GITHUB_RUN_ID");

			// Act
			const url = resolveRunUrl();

			// Assert
			expect(url).toBeNull();
		});
	});

	describe("issueContextFromEnv", () => {
		const originalEnv = { ...process.env };

		afterEach(() => {
			process.env = { ...originalEnv };
		});

		it("builds an IssueContext from ISSUE_NUMBER, GITHUB_TOKEN, and github.context.repo", () => {
			// Arrange
			process.env.GITHUB_TOKEN = "fake-token";
			process.env.ISSUE_NUMBER = "57";

			// Act
			const ctx = issueContextFromEnv();

			// Assert
			expect(github.getOctokit).toHaveBeenCalledWith("fake-token");
			expect(ctx.issueNumber).toBe(57);
			expect(ctx.owner).toBe(github.context.repo.owner);
			expect(ctx.repo).toBe(github.context.repo.repo);
		});

		it("defaults the issue number to 0 rather than throwing when ISSUE_NUMBER is unset", () => {
			// Arrange
			process.env.GITHUB_TOKEN = "fake-token";
			Reflect.deleteProperty(process.env, "ISSUE_NUMBER");

			// Act
			const ctx = issueContextFromEnv();

			// Assert
			expect(ctx.issueNumber).toBe(0);
		});
	});

	describe("resolvePatOctokit", () => {
		const originalEnv = { ...process.env };

		afterEach(() => {
			process.env = { ...originalEnv };
		});

		it("returns an AGENT_PAT-authenticated client when the secret is configured", () => {
			// Arrange
			process.env.AGENT_PAT = "pat-token";

			// Act
			const client = resolvePatOctokit();

			// Assert
			expect(github.getOctokit).toHaveBeenCalledWith("pat-token");
			expect(client).not.toBeNull();
		});

		it("returns null when AGENT_PAT isn't configured, rather than authenticating with an empty token", () => {
			// Arrange
			Reflect.deleteProperty(process.env, "AGENT_PAT");

			// Act
			const client = resolvePatOctokit();

			// Assert
			expect(client).toBeNull();
		});
	});

	describe("LABELS", () => {
		it("holds the new pipeline's real, {role}:{status}-namespaced label strings", () => {
			// Arrange
			// Act
			// Assert
			expect(LABELS).toEqual({
				agentBlocked: "agent:blocked",
				agentInProgress: "agent:in-progress",
				devNeeded: "dev:needed",
				grillNeeded: "grill:needed",
				needsInfo: "needs-info",
				readyForAgent: "ready-for-agent",
				reviewNeeded: "review:needed",
				specNeeded: "spec:needed",
				specReady: "spec:ready",
				ticketsNeeded: "tickets:needed",
				ticketsProposed: "tickets:proposed",
				ticketsWired: "tickets:wired",
			});
		});

		it("derives LabelSchema's accepted values from LABELS, with no separate list", () => {
			// Arrange
			// Act
			// Assert
			for (const value of Object.values(LABELS)) {
				expect(LabelSchema.safeParse(value).success).toBe(true);
			}
		});

		it("rejects a string that is not one of LABELS' values", () => {
			// Arrange
			// Act
			const result = LabelSchema.safeParse("not-a-real-label");

			// Assert
			expect(result.success).toBe(false);
		});
	});

	describe("hasStatus", () => {
		it("recognizes an error carrying the given status code", () => {
			// Arrange
			const error = { status: 422 };

			// Act
			const result = hasStatus(error, 422);

			// Assert
			expect(result).toBe(true);
		});

		it("does not match a different status code", () => {
			// Arrange
			const error = { status: 500 };

			// Act
			const result = hasStatus(error, 422);

			// Assert
			expect(result).toBe(false);
		});

		it("does not match a non-object thrown value", () => {
			// Arrange
			const error = "plain string error";

			// Act
			const result = hasStatus(error, 422);

			// Assert
			expect(result).toBe(false);
		});
	});

	describe("extractLabelNames", () => {
		it("extracts label names from string array and object array", () => {
			// Arrange
			const labels = ["idea", { name: "spec-ready" }, { name: undefined }];

			// Act
			const result = extractLabelNames(labels);

			// Assert
			expect(result).toEqual(["idea", "spec-ready", ""]);
		});

		it("returns an empty array when labels is undefined", () => {
			// Arrange
			// Act
			const result = extractLabelNames(undefined);

			// Assert
			expect(result).toEqual([]);
		});
	});

	describe("removeLabelIfPresent", () => {
		it("removes label if present in issue labels", async () => {
			// Arrange
			const octokit = github.getOctokit("fake-token");
			const ctx = {
				issueNumber: 42,
				octokit,
				owner: "jackmaders",
				repo: "watchpoint",
			};

			// Act
			await removeLabelIfPresent(ctx, ["spec-ready", "idea"], "spec-ready");

			// Assert
			expect(octokit.rest.issues.removeLabel).toHaveBeenCalledWith({
				issue_number: 42,
				name: "spec-ready",
				owner: "jackmaders",
				repo: "watchpoint",
			});
		});

		it("does nothing if label is not present", async () => {
			// Arrange
			const octokit = github.getOctokit("fake-token");
			const ctx = {
				issueNumber: 42,
				octokit,
				owner: "jackmaders",
				repo: "watchpoint",
			};

			// Act
			await removeLabelIfPresent(ctx, ["idea"], "spec-ready");

			// Assert
			expect(octokit.rest.issues.removeLabel).not.toHaveBeenCalled();
		});

		it("ignores 404 error when removing label", async () => {
			// Arrange
			const octokit = github.getOctokit("fake-token");
			vi.mocked(octokit.rest.issues.removeLabel).mockRejectedValueOnce({
				status: 404,
			});
			const ctx = {
				issueNumber: 42,
				octokit,
				owner: "jackmaders",
				repo: "watchpoint",
			};

			// Act
			const act = removeLabelIfPresent(ctx, ["spec-ready"], "spec-ready");

			// Assert
			await expect(act).resolves.not.toThrow();
		});

		it("rethrows non-404 error when removing label", async () => {
			// Arrange
			const octokit = github.getOctokit("fake-token");
			const error = new Error("Network error");
			vi.mocked(octokit.rest.issues.removeLabel).mockRejectedValueOnce(error);
			const ctx = {
				issueNumber: 42,
				octokit,
				owner: "jackmaders",
				repo: "watchpoint",
			};

			// Act
			const act = removeLabelIfPresent(ctx, ["spec-ready"], "spec-ready");

			// Assert
			await expect(act).rejects.toThrow("Network error");
		});
	});

	describe("transitionState", () => {
		it("removes specified labels and adds new specified labels", async () => {
			// Arrange
			const octokit = github.getOctokit("fake-token");
			const ctx = {
				issueNumber: 42,
				octokit,
				owner: "jackmaders",
				repo: "watchpoint",
			};

			// Act
			await transitionState(ctx, ["spec-needed", "old-label"], {
				add: ["spec-ready"],
				remove: ["spec-needed"],
			});

			// Assert
			expect(octokit.rest.issues.removeLabel).toHaveBeenCalledWith({
				issue_number: 42,
				name: "spec-needed",
				owner: "jackmaders",
				repo: "watchpoint",
			});
			expect(octokit.rest.issues.addLabels).toHaveBeenCalledWith({
				issue_number: 42,
				labels: ["spec-ready"],
				owner: "jackmaders",
				repo: "watchpoint",
			});
		});

		it("does nothing when neither add nor remove is given", async () => {
			// Arrange
			const octokit = github.getOctokit("fake-token");
			const ctx = {
				issueNumber: 42,
				octokit,
				owner: "jackmaders",
				repo: "watchpoint",
			};

			// Act
			await transitionState(ctx, ["spec-needed"], {});

			// Assert
			expect(octokit.rest.issues.removeLabel).not.toHaveBeenCalled();
			expect(octokit.rest.issues.addLabels).not.toHaveBeenCalled();
		});

		it("returns the resulting label names, so a caller can chain the next transition off an accurate snapshot", async () => {
			// Arrange
			const octokit = github.getOctokit("fake-token");
			const ctx = {
				issueNumber: 42,
				octokit,
				owner: "jackmaders",
				repo: "watchpoint",
			};

			// Act
			const result = await transitionState(ctx, ["spec-needed", "old-label"], {
				add: ["spec-ready"],
				remove: ["spec-needed"],
			});

			// Assert
			expect(result).toEqual(["old-label", "spec-ready"]);
		});
	});

	describe("fetchIssueContext", () => {
		it("fetches issue body and comments filtering bot error comments", async () => {
			// Arrange
			const octokit = github.getOctokit("fake-token");
			vi.mocked(octokit.rest.issues.get).mockResolvedValueOnce({
				data: {
					body: "Original proposal body",
					labels: [{ name: "idea" }],
					number: 42,
					title: "Feature Title",
				},
			} as unknown as Awaited<ReturnType<typeof octokit.rest.issues.get>>);
			vi.mocked(octokit.paginate).mockResolvedValueOnce([
				{ body: "PM Agent Error occurred", user: { type: "Bot" } },
				{ body: "User feedback comment", user: { type: "User" } },
				{ body: "Agent response", user: { type: "Bot" } },
			]);
			const ctx = {
				issueNumber: 42,
				octokit,
				owner: "jackmaders",
				repo: "watchpoint",
			};

			// Act
			const result = await fetchIssueContext(ctx);

			// Assert
			expect(result.issue.title).toBe("Feature Title");
			expect(result.latestUserComment).toBe("User feedback comment");
			expect(result.conversation).toContain("User Context (Issue Body):");
			expect(result.conversation).toContain("User feedback comment");
			expect(result.conversation).not.toContain("PM Agent Error");
		});

		it("defaults a null issue body and a bodyless, userless comment to empty strings", async () => {
			// Arrange
			const octokit = github.getOctokit("fake-token");
			vi.mocked(octokit.rest.issues.get).mockResolvedValueOnce({
				data: {
					body: null,
					labels: [],
					number: 42,
					title: "Feature Title",
				},
			} as unknown as Awaited<ReturnType<typeof octokit.rest.issues.get>>);
			vi.mocked(octokit.paginate).mockResolvedValueOnce([{}]);
			const ctx = {
				issueNumber: 42,
				octokit,
				owner: "jackmaders",
				repo: "watchpoint",
			};

			// Act
			const result = await fetchIssueContext(ctx);

			// Assert
			expect(result.conversation).toContain("User Context (Issue Body):\n\n\n");
			expect(result.latestUserComment).toBe("");
		});
	});

	describe("formatGeminiError", () => {
		it("formats Error objects with message", () => {
			// Arrange
			const err = new Error("API quota exceeded");

			// Act
			const result = formatGeminiError(err);

			// Assert
			expect(result).toContain("API quota exceeded");
		});

		it("formats string errors", () => {
			// Arrange
			const err = "String error message";

			// Act
			const result = formatGeminiError(err);

			// Assert
			expect(result).toBe("String error message");
		});

		it("formats non-error object structures", () => {
			// Arrange
			const err = { status: 500 };

			// Act
			const result = formatGeminiError(err);

			// Assert
			expect(result).toContain('{"status":500}');
		});

		it("falls back to a fixed message when the error can't be JSON.stringify'd", () => {
			// Arrange
			const circular: Record<string, unknown> = {};
			circular.self = circular;

			// Act
			const result = formatGeminiError(circular);

			// Assert
			expect(result).toBe("Unknown error occurred.");
		});
	});

	describe("postBotComment", () => {
		it("posts a comment carrying the bot marker", async () => {
			// Arrange
			const octokit = github.getOctokit("fake-token");
			const ctx = {
				issueNumber: 42,
				octokit,
				owner: "jackmaders",
				repo: "watchpoint",
			};

			// Act
			await postBotComment(ctx, "🏓 pong");

			// Assert
			expect(octokit.rest.issues.createComment).toHaveBeenCalledWith({
				body: `${BOT_COMMENT_MARKER}\n🏓 pong`,
				issue_number: 42,
				owner: "jackmaders",
				repo: "watchpoint",
			});
		});

		it("propagates a failure to create the comment", async () => {
			// Arrange
			const octokit = github.getOctokit("fake-token");
			vi.mocked(octokit.rest.issues.createComment).mockRejectedValueOnce(
				new Error("API offline"),
			);
			const ctx = {
				issueNumber: 42,
				octokit,
				owner: "jackmaders",
				repo: "watchpoint",
			};

			// Act
			const act = postBotComment(ctx, "🏓 pong");

			// Assert
			await expect(act).rejects.toThrow("API offline");
		});
	});

	describe("postIssueErrorComment", () => {
		const originalEnv = { ...process.env };

		afterEach(() => {
			process.env = { ...originalEnv };
		});

		it("posts formatted error comment to issue", async () => {
			// Arrange
			const octokit = github.getOctokit("fake-token");
			const ctx = {
				issueNumber: 42,
				octokit,
				owner: "jackmaders",
				repo: "watchpoint",
			};

			// Act
			await postIssueErrorComment(ctx, "Dispatch", new Error("Quota limit"));

			// Assert
			expect(octokit.rest.issues.createComment).toHaveBeenCalledWith({
				body: expect.stringContaining("⚠️ **Dispatch Error:**"),
				issue_number: 42,
				owner: "jackmaders",
				repo: "watchpoint",
			});
			expect(octokit.rest.issues.createComment).toHaveBeenCalledWith({
				body: expect.stringContaining("Quota limit"),
				issue_number: 42,
				owner: "jackmaders",
				repo: "watchpoint",
			});
		});

		it("appends a link to the run when the GitHub Actions env vars are present", async () => {
			// Arrange
			process.env.GITHUB_SERVER_URL = "https://github.com";
			process.env.GITHUB_REPOSITORY = "jackmaders/watchpoint";
			process.env.GITHUB_RUN_ID = "123";
			const octokit = github.getOctokit("fake-token");
			const ctx = {
				issueNumber: 42,
				octokit,
				owner: "jackmaders",
				repo: "watchpoint",
			};

			// Act
			await postIssueErrorComment(ctx, "Grill", new Error("boom"));

			// Assert
			expect(octokit.rest.issues.createComment).toHaveBeenCalledWith({
				body: expect.stringContaining(
					"https://github.com/jackmaders/watchpoint/actions/runs/123",
				),
				issue_number: 42,
				owner: "jackmaders",
				repo: "watchpoint",
			});
		});

		it("omits the run link when the GitHub Actions env vars are absent", async () => {
			// Arrange
			Reflect.deleteProperty(process.env, "GITHUB_RUN_ID");
			const octokit = github.getOctokit("fake-token");
			const ctx = {
				issueNumber: 42,
				octokit,
				owner: "jackmaders",
				repo: "watchpoint",
			};

			// Act
			await postIssueErrorComment(ctx, "Grill", new Error("boom"));

			// Assert
			expect(octokit.rest.issues.createComment).toHaveBeenCalledWith({
				body: expect.not.stringContaining("/actions/runs/"),
				issue_number: 42,
				owner: "jackmaders",
				repo: "watchpoint",
			});
		});

		it("handles errors thrown while attempting to post error comment", async () => {
			// Arrange
			const octokit = github.getOctokit("fake-token");
			vi.mocked(octokit.rest.issues.createComment).mockRejectedValueOnce(
				new Error("API offline"),
			);
			const ctx = {
				issueNumber: 42,
				octokit,
				owner: "jackmaders",
				repo: "watchpoint",
			};

			// Act
			const act = postIssueErrorComment(ctx, "Dispatch", new Error("Quota"));

			// Assert
			await expect(act).resolves.not.toThrow();
		});
	});
});
