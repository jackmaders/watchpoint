import * as github from "@actions/github";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockOctokit } from "../__mocks__/@actions/github";
import { mockGenerateContent } from "../__mocks__/@google/genai";
import {
	APPROVED_LABEL,
	CHANGES_REQUESTED_LABEL,
	NEEDS_HUMAN_REVIEW_LABEL,
	REVIEW_ROUND_1_LABEL,
} from "./pm-shared";
import {
	determineReviewRound,
	fetchPRContext,
	generateReviewDecision,
	isReviewerTrigger,
	postPRReviewAndLabels,
	type ReviewDecisionData,
	run,
} from "./reviewer-agent";

vi.mock("@actions/github");
vi.mock("@google/genai");

describe("reviewer-agent unit tests", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		process.env.GITHUB_TOKEN = "fake-token";
		process.env.GEMINI_API_KEY = "fake-api-key";
		process.env.ISSUE_NUMBER = "42";
		delete (github.context as { payload?: unknown }).payload;
	});

	describe("isReviewerTrigger helper", () => {
		it("returns true for PR opened, synchronize, or reopened actions", () => {
			// Arrange & Act & Assert
			expect(isReviewerTrigger("opened")).toBe(true);
			expect(isReviewerTrigger("synchronize")).toBe(true);
			expect(isReviewerTrigger("reopened")).toBe(true);
		});

		it("returns true for PR comment containing /review or /re-review", () => {
			// Arrange & Act & Assert
			expect(isReviewerTrigger(undefined, "Please /review this PR")).toBe(true);
			expect(isReviewerTrigger(undefined, "/re-review after fix")).toBe(true);
		});

		it("returns false when no trigger condition matches", () => {
			// Arrange & Act & Assert
			expect(isReviewerTrigger("closed")).toBe(false);
			expect(isReviewerTrigger(undefined, "Normal comment")).toBe(false);
		});
	});

	describe("determineReviewRound helper", () => {
		it("returns round-1 when no review round labels are present", () => {
			// Arrange
			const labels = [{ name: "bug" }];

			// Act & Assert
			expect(determineReviewRound(labels)).toBe("round-1");
		});

		it("returns round-2 when review-round-1 label is present", () => {
			// Arrange
			const labels = [{ name: REVIEW_ROUND_1_LABEL }];

			// Act & Assert
			expect(determineReviewRound(labels)).toBe("round-2");
		});

		it("returns escalated when needs-human-review label is present", () => {
			// Arrange & Act & Assert
			expect(determineReviewRound([{ name: NEEDS_HUMAN_REVIEW_LABEL }])).toBe(
				"escalated",
			);
		});
	});

	describe("fetchPRContext helper", () => {
		it("fetches PR details, files, and filters bot comments", async () => {
			// Arrange
			const ctx = {
				issueNumber: 42,
				octokit: mockOctokit as unknown as ReturnType<typeof github.getOctokit>,
				owner: "jackmaders",
				repo: "watchpoint",
			};
			mockOctokit.paginate.mockResolvedValueOnce([
				{ body: "User feedback", user: { type: "User" } },
				{ body: "<!-- bot-comment --> Bot msg", user: { type: "Bot" } },
			]);

			// Act
			const result = await fetchPRContext(ctx);

			// Assert
			expect(result.pr.number).toBe(42);
			expect(result.files).toHaveLength(2);
			expect(result.latestCommentText).toBe("User feedback");
			expect(result.conversation).toContain("User Comment: User feedback");
			expect(result.conversation).toContain("```diff\n");
		});
	});

	describe("generateReviewDecision helper", () => {
		it("calls Gemini AI and returns parsed ReviewDecisionData", async () => {
			// Arrange
			const ai = new (await import("@google/genai")).GoogleGenAI({
				apiKey: "fake",
			});
			const mockDecision: ReviewDecisionData = {
				decision: "APPROVE",
				feedbackItems: [],
				summary: "Code looks great and passes FSD architecture rules.",
			};
			mockGenerateContent.mockResolvedValueOnce({
				text: JSON.stringify(mockDecision),
			});

			// Act
			const decision = await generateReviewDecision(
				ai,
				"System prompt",
				"Prompt text",
			);

			// Assert
			expect(decision.decision).toBe("APPROVE");
			expect(decision.summary).toBe(mockDecision.summary);
		});

		it("throws error when Gemini returns empty response text", async () => {
			// Arrange
			const ai = new (await import("@google/genai")).GoogleGenAI({
				apiKey: "fake",
			});
			mockGenerateContent.mockResolvedValueOnce({
				text: "",
			});

			// Act & Assert
			await expect(
				generateReviewDecision(ai, "Prompt", "Text"),
			).rejects.toThrow("Gemini returned an empty reviewer AI response.");
		});
	});

	describe("postPRReviewAndLabels helper", () => {
		it("posts REQUEST_CHANGES review and labels for Round 1 findings", async () => {
			// Arrange
			const ctx = {
				issueNumber: 42,
				octokit: mockOctokit as unknown as ReturnType<typeof github.getOctokit>,
				owner: "jackmaders",
				repo: "watchpoint",
			};
			const reviewData: ReviewDecisionData = {
				decision: "REQUEST_CHANGES",
				feedbackItems: [
					{
						category: "architectural",
						description: "Move UI component into src/_pages/auth/",
						file: "app/auth/page.tsx",
						severity: "blocking",
						title: "FSD Violation",
					},
				],
				summary: "Architectural issues found.",
			};

			// Act
			await postPRReviewAndLabels(ctx, reviewData, "round-1");

			// Assert
			expect(mockOctokit.rest.issues.addLabels).toHaveBeenCalledWith(
				expect.objectContaining({
					labels: [REVIEW_ROUND_1_LABEL, CHANGES_REQUESTED_LABEL],
				}),
			);
			expect(mockOctokit.rest.pulls.createReview).toHaveBeenCalledWith(
				expect.objectContaining({
					event: "REQUEST_CHANGES",
				}),
			);
		});

		it("posts APPROVE review and removes previous round labels when clean", async () => {
			// Arrange
			const ctx = {
				issueNumber: 42,
				octokit: mockOctokit as unknown as ReturnType<typeof github.getOctokit>,
				owner: "jackmaders",
				repo: "watchpoint",
			};
			mockOctokit.rest.issues.get.mockResolvedValueOnce({
				data: { labels: [{ name: CHANGES_REQUESTED_LABEL }] },
			} as never);
			const reviewData: ReviewDecisionData = {
				decision: "APPROVE",
				feedbackItems: [],
				summary: "All checks passing cleanly.",
			};

			// Act
			await postPRReviewAndLabels(ctx, reviewData, "round-2");

			// Assert
			expect(mockOctokit.rest.issues.removeLabel).toHaveBeenCalledWith(
				expect.objectContaining({
					name: CHANGES_REQUESTED_LABEL,
				}),
			);
			expect(mockOctokit.rest.issues.addLabels).toHaveBeenCalledWith(
				expect.objectContaining({
					labels: [APPROVED_LABEL],
				}),
			);
			expect(mockOctokit.rest.pulls.createReview).toHaveBeenCalledWith(
				expect.objectContaining({
					event: "APPROVE",
				}),
			);
		});

		it("escalates to human maintainers when Round 2 still has blocking issues", async () => {
			// Arrange
			const ctx = {
				issueNumber: 42,
				octokit: mockOctokit as unknown as ReturnType<typeof github.getOctokit>,
				owner: "jackmaders",
				repo: "watchpoint",
			};
			mockOctokit.rest.issues.get.mockResolvedValueOnce({
				data: { labels: [{ name: REVIEW_ROUND_1_LABEL }] },
			} as never);
			const reviewData: ReviewDecisionData = {
				decision: "REQUEST_CHANGES",
				feedbackItems: [
					{
						category: "quality",
						description: "Spaghetti conditional unresolved",
						severity: "blocking",
						title: "Quality Smell",
					},
				],
				summary: "Issues remain after 2 rounds.",
			};

			// Act
			await postPRReviewAndLabels(ctx, reviewData, "round-2");

			// Assert
			expect(mockOctokit.rest.issues.addLabels).toHaveBeenCalledWith(
				expect.objectContaining({
					labels: [NEEDS_HUMAN_REVIEW_LABEL],
				}),
			);
			expect(mockOctokit.rest.pulls.createReview).toHaveBeenCalledWith(
				expect.objectContaining({
					event: "COMMENT",
				}),
			);
		});

		it("handles explicit ESCALATE decision", async () => {
			// Arrange
			const ctx = {
				issueNumber: 42,
				octokit: mockOctokit as unknown as ReturnType<typeof github.getOctokit>,
				owner: "jackmaders",
				repo: "watchpoint",
			};
			mockOctokit.rest.issues.get.mockResolvedValueOnce({
				data: { labels: [] },
			} as never);
			const reviewData: ReviewDecisionData = {
				decision: "ESCALATE",
				feedbackItems: [
					{
						category: "architectural",
						description: "Needs senior architect input",
						severity: "blocking",
						title: "Major Redesign Needed",
					},
				],
				summary: "Escalating directly.",
			};

			// Act
			await postPRReviewAndLabels(ctx, reviewData, "round-1");

			// Assert
			expect(mockOctokit.rest.issues.addLabels).toHaveBeenCalledWith(
				expect.objectContaining({
					labels: [NEEDS_HUMAN_REVIEW_LABEL],
				}),
			);
		});
	});

	describe("run integration workflow execution", () => {
		it("skips execution cleanly when trigger conditions are not met", async () => {
			// Arrange
			(github.context as { payload?: unknown }).payload = { action: "closed" };

			// Act & Assert
			await expect(run()).resolves.not.toThrow();
		});

		it("executes complete review workflow when PR is opened", async () => {
			// Arrange
			(github.context as { payload?: unknown }).payload = { action: "opened" };
			mockOctokit.paginate.mockResolvedValueOnce([]);
			const mockDecision: ReviewDecisionData = {
				decision: "APPROVE",
				feedbackItems: [],
				summary: "Approved cleanly.",
			};
			mockGenerateContent.mockResolvedValueOnce({
				text: JSON.stringify(mockDecision),
			});

			// Act
			await run();

			// Assert
			expect(mockOctokit.rest.pulls.createReview).toHaveBeenCalledWith(
				expect.objectContaining({
					event: "APPROVE",
				}),
			);
		});

		it("handles runtime errors gracefully and posts issue error comment", async () => {
			// Arrange
			(github.context as { payload?: unknown }).payload = { action: "opened" };
			mockOctokit.rest.pulls.get.mockRejectedValueOnce(
				new Error("GitHub API Error"),
			);
			const exitSpy = vi
				.spyOn(process, "exit")
				.mockImplementation((() => {}) as never);

			// Act
			await run();

			// Assert
			expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith(
				expect.objectContaining({
					body: expect.stringContaining("GitHub API Error"),
				}),
			);
			expect(exitSpy).toHaveBeenCalledWith(1);
			exitSpy.mockRestore();
		});
	});
});
