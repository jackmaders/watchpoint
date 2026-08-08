import * as github from "@actions/github";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockOctokit } from "../__mocks__/@actions/github";
import { mockGenerateContent } from "../__mocks__/@google/genai";
import {
	extractTargetSliceName,
	generateDeveloperImplementation,
	isDeveloperTrigger,
	postDeveloperCompletedComment,
	run,
	sanitizeBranchName,
} from "./developer-agent";
import { DEV_IN_PROGRESS_LABEL, DEV_NEEDED_LABEL } from "./pm-shared";

vi.mock("@actions/github");
vi.mock("@google/genai");

describe("developer-agent unit tests", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockOctokit.rest.issues.get.mockReset();
		process.env.GITHUB_TOKEN = "fake-token";
		process.env.GEMINI_API_KEY = "fake-api-key";
		process.env.ISSUE_NUMBER = "42";
		delete (github.context as { payload?: unknown }).payload;
	});

	describe("isDeveloperTrigger helper", () => {
		it("returns true if dev-needed label is present", () => {
			// Arrange
			const labels = [{ name: DEV_NEEDED_LABEL }];

			// Act
			const trigger = isDeveloperTrigger(labels);

			// Assert
			expect(trigger).toBe(true);
		});

		it("returns true if action is assigned", () => {
			// Arrange
			const labels: string[] = [];
			const action = "assigned";

			// Act
			const trigger = isDeveloperTrigger(labels, action);

			// Assert
			expect(trigger).toBe(true);
		});

		it("returns true if comment contains /dev or /implement", () => {
			// Arrange
			const labels: string[] = [];
			const comment = "/implement this slice please";

			// Act
			const trigger = isDeveloperTrigger(labels, undefined, comment);

			// Assert
			expect(trigger).toBe(true);
		});

		it("returns false if dev-needed label is missing and no triggers match", () => {
			// Arrange
			const labels = [{ name: "idea" }];

			// Act
			const trigger = isDeveloperTrigger(labels);

			// Assert
			expect(trigger).toBe(false);
		});
	});

	describe("extractTargetSliceName helper", () => {
		it("extracts slice name from body file paths", () => {
			// Arrange
			const body = "Target file scope: `src/_pages/auth/ui/LoginForm.tsx`";

			// Act
			const slice = extractTargetSliceName(body);

			// Assert
			expect(slice).toBe("auth");
		});

		it("extracts slice name from body @/_pages path aliases", () => {
			// Arrange
			const body = "Target file scope: `@/_pages/dashboard/ui/Widget.tsx`";

			// Act
			const slice = extractTargetSliceName(body);

			// Assert
			expect(slice).toBe("dashboard");
		});

		it("returns fallback 'feature' when no slice path is in body", () => {
			// Arrange
			const body = "No FSD slice path specified";

			// Act
			const slice = extractTargetSliceName(body);

			// Assert
			expect(slice).toBe("feature");
		});
	});

	describe("sanitizeBranchName helper", () => {
		it("formats clean Git branch name with slice name from body", () => {
			// Arrange
			const title = "Setup Prisma ORM & Auth System!";
			const body = "Target: `src/_pages/auth/ui/Form.tsx`";

			// Act
			const branch = sanitizeBranchName(title, 42, body);

			// Assert
			expect(branch).toBe("dev/issue-42-auth-setup-prisma-orm-auth-system");
		});

		it("trims trailing dashes cleanly even when title slicing occurs", () => {
			// Arrange
			const title = "Setup Prisma ORM Auth System Extra Long Title";

			// Act
			const branch = sanitizeBranchName(title, 42);

			// Assert
			expect(branch.endsWith("-")).toBe(false);
		});

		it("uses fallback slice name feature when no body is provided", () => {
			// Arrange
			const title = "Setup Prisma ORM & Auth System!";

			// Act
			const branch = sanitizeBranchName(title, 42);

			// Assert
			expect(branch).toBe("dev/issue-42-feature-setup-prisma-orm-auth-system");
		});
	});

	describe("generateDeveloperImplementation helper", () => {
		it("calls Gemini AI and returns generated code implementation summary", async () => {
			// Arrange
			const ai = new (await import("@google/genai")).GoogleGenAI({
				apiKey: "fake",
			});
			mockGenerateContent.mockResolvedValueOnce({
				text: "```typescript\n// Implementation code\n```",
			});

			// Act
			const summary = await generateDeveloperImplementation(
				ai,
				"System prompt",
				"Issue text",
			);

			// Assert
			expect(summary).toContain("// Implementation code");
		});

		it("throws error when Gemini returns empty response", async () => {
			// Arrange
			const ai = new (await import("@google/genai")).GoogleGenAI({
				apiKey: "fake",
			});
			mockGenerateContent.mockResolvedValueOnce({
				text: "",
			});

			// Act & Assert
			await expect(
				generateDeveloperImplementation(ai, "Prompt", "Text"),
			).rejects.toThrow(
				"Gemini returned an empty developer implementation response.",
			);
		});
	});

	describe("postDeveloperCompletedComment", () => {
		it("posts completion comment on GitHub issue", async () => {
			// Arrange
			const ctx = {
				issueNumber: 42,
				octokit: mockOctokit as unknown as ReturnType<typeof github.getOctokit>,
				owner: "jackmaders",
				repo: "watchpoint",
			};

			// Act
			await postDeveloperCompletedComment(
				ctx,
				"Summary details",
				"dev/issue-42-test",
			);

			// Assert
			expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledTimes(1);
		});
	});

	describe("run integration workflow execution", () => {
		it("skips execution smoothly when issue is not ready for dev", async () => {
			// Arrange
			mockOctokit.rest.issues.get.mockResolvedValueOnce({
				data: {
					body: "Issue body",
					id: 42,
					labels: [],
					number: 42,
					title: "Unready Issue",
				},
			} as never);
			mockOctokit.paginate.mockResolvedValueOnce([]);

			// Act & Assert
			await expect(run()).resolves.not.toThrow();
		});

		it("executes complete developer workflow when issue has dev-needed label", async () => {
			// Arrange
			(github.context as { payload?: unknown }).payload = {
				issue: { labels: [{ name: DEV_NEEDED_LABEL }] },
			};
			mockOctokit.rest.issues.get.mockResolvedValueOnce({
				data: {
					body: "Scope: `src/_pages/home/`",
					id: 42,
					labels: [{ name: DEV_NEEDED_LABEL }],
					number: 42,
					title: "Build Home Page",
				},
			} as never);
			mockOctokit.paginate.mockResolvedValueOnce([]);
			mockGenerateContent.mockResolvedValueOnce({
				text: "Implemented feature successfully.",
			});

			// Act
			await run();

			// Assert
			expect(mockOctokit.rest.issues.addLabels).toHaveBeenCalledWith(
				expect.objectContaining({
					labels: [DEV_IN_PROGRESS_LABEL],
				}),
			);
		});

		it("handles errors gracefully and posts issue error comment", async () => {
			// Arrange
			(github.context as { payload?: unknown }).payload = {
				issue: { labels: [{ name: DEV_NEEDED_LABEL }] },
			};
			mockOctokit.rest.issues.get.mockRejectedValueOnce(
				new Error("Network Failure"),
			);
			const exitSpy = vi
				.spyOn(process, "exit")
				.mockImplementation((() => {}) as never);

			// Act
			await run();

			// Assert
			expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith(
				expect.objectContaining({
					body: expect.stringContaining("Network Failure"),
				}),
			);
			expect(exitSpy).toHaveBeenCalledWith(1);
			exitSpy.mockRestore();
		});
	});
});
