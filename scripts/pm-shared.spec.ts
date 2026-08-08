import * as github from "@actions/github";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	extractLabelNames,
	fetchIssueContext,
	formatGeminiError,
	postIssueErrorComment,
	READY_FOR_DEV_LABEL,
	REFINED_LABEL,
	removeLabelIfPresent,
	SPEC_READY_LABEL,
} from "./pm-shared";

vi.mock("@actions/github");

describe("pm-shared unit tests", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("constants", () => {
		it("defines correct label constants", () => {
			expect(SPEC_READY_LABEL).toBe("spec-ready");
			expect(READY_FOR_DEV_LABEL).toBe("ready-for-dev");
			expect(REFINED_LABEL).toBe("refined");
		});
	});

	describe("extractLabelNames helper", () => {
		it("extracts label names from string array and object array", () => {
			const labels = ["idea", { name: "spec-ready" }, { name: undefined }];
			expect(extractLabelNames(labels)).toEqual(["idea", "spec-ready", ""]);
		});
	});

	describe("removeLabelIfPresent helper", () => {
		it("removes label if present in issue labels", async () => {
			const octokit = github.getOctokit("fake-token");
			const ctx = {
				issueNumber: 42,
				octokit,
				owner: "jackmaders",
				repo: "watchpoint",
			};

			await removeLabelIfPresent(ctx, ["spec-ready", "idea"], "spec-ready");

			expect(octokit.rest.issues.removeLabel).toHaveBeenCalledWith({
				issue_number: 42,
				name: "spec-ready",
				owner: "jackmaders",
				repo: "watchpoint",
			});
		});

		it("does nothing if label is not present", async () => {
			const octokit = github.getOctokit("fake-token");
			const ctx = {
				issueNumber: 42,
				octokit,
				owner: "jackmaders",
				repo: "watchpoint",
			};

			await removeLabelIfPresent(ctx, ["idea"], "spec-ready");

			expect(octokit.rest.issues.removeLabel).not.toHaveBeenCalled();
		});

		it("ignores 404 error when removing label", async () => {
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

			await expect(
				removeLabelIfPresent(ctx, ["spec-ready"], "spec-ready"),
			).resolves.not.toThrow();
		});

		it("rethrows non-404 error when removing label", async () => {
			const octokit = github.getOctokit("fake-token");
			const error = new Error("Network error");
			vi.mocked(octokit.rest.issues.removeLabel).mockRejectedValueOnce(error);

			const ctx = {
				issueNumber: 42,
				octokit,
				owner: "jackmaders",
				repo: "watchpoint",
			};

			await expect(
				removeLabelIfPresent(ctx, ["spec-ready"], "spec-ready"),
			).rejects.toThrow("Network error");
		});
	});

	describe("fetchIssueContext helper", () => {
		it("fetches issue body and comments filtering bot error comments", async () => {
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

			const result = await fetchIssueContext(ctx);

			expect(result.issue.title).toBe("Feature Title");
			expect(result.latestUserComment).toBe("User feedback comment");
			expect(result.conversation).toContain("User Context (Issue Body):");
			expect(result.conversation).toContain("User feedback comment");
			expect(result.conversation).not.toContain("PM Agent Error");
		});
	});

	describe("formatGeminiError helper", () => {
		it("formats Error objects with message", () => {
			const err = new Error("API quota exceeded");
			expect(formatGeminiError(err)).toContain("API quota exceeded");
		});

		it("formats string errors", () => {
			expect(formatGeminiError("String error message")).toBe(
				"String error message",
			);
		});

		it("formats non-error object structures", () => {
			expect(formatGeminiError({ status: 500 })).toContain('{"status":500}');
		});
	});

	describe("postIssueErrorComment helper", () => {
		it("posts formatted error comment to issue", async () => {
			const octokit = github.getOctokit("fake-token");
			const ctx = {
				issueNumber: 42,
				octokit,
				owner: "jackmaders",
				repo: "watchpoint",
			};

			await postIssueErrorComment(ctx, "PM Agent", new Error("Quota limit"));

			expect(octokit.rest.issues.createComment).toHaveBeenCalledWith({
				body: expect.stringContaining("⚠️ **PM Agent Error:**"),
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

		it("handles errors thrown while attempting to post error comment", async () => {
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

			await expect(
				postIssueErrorComment(ctx, "PM Agent", new Error("Quota limit")),
			).resolves.not.toThrow();
		});
	});
});
