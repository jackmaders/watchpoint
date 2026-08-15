import { describe, expect, it } from "vitest";
import {
	buildPrPayload,
	formatCommitMessage,
	generateBranchName,
} from "../git-manager";

describe("git-manager", () => {
	describe("generateBranchName", () => {
		it("uses custom branch if provided", () => {
			// Arrange & Act
			const branch = generateBranchName({
				customBranch: "feat/my-custom-branch",
			});

			// Assert
			expect(branch).toBe("feat/my-custom-branch");
		});

		it("generates branch name from issue with type and title", () => {
			// Arrange
			const issue = {
				body: "Implement Sandcastle orchestration",
				number: 152,
				title:
					"feat(sandbox): 🏰 orchestrate autonomous coding agents with Sandcastle",
			};

			// Act
			const branch = generateBranchName({ issue });

			// Assert
			expect(branch).toBe(
				"feat/issue-152-orchestrate-autonomous-coding-agents-with-sandcastle",
			);
		});

		it("generates branch name from issue without conventional prefix", () => {
			// Arrange
			const issue = {
				body: "Audio desyncs on seek",
				number: 42,
				title: "Fix timeline audio sync bug",
			};

			// Act
			const branch = generateBranchName({ issue });

			// Assert
			expect(branch).toBe("fix/issue-42-timeline-audio-sync-bug");
		});

		it("generates branch name for test and docs issues", () => {
			// Arrange
			const issueTest = {
				body: "",
				number: 50,
				title: "Test coverage improvements for media",
			};
			const issueDocs = {
				body: "",
				number: 51,
				title: "Docs update ubiquitous language",
			};

			// Act
			const branchTest = generateBranchName({ issue: issueTest });
			const branchDocs = generateBranchName({ issue: issueDocs });

			// Assert
			expect(branchTest).toBe("test/issue-50-coverage-improvements-for-media");
			expect(branchDocs).toBe("docs/issue-51-update-ubiquitous-language");
		});

		it("generates branch name from ad-hoc prompt", () => {
			// Arrange
			const prompt = "Refactor interactive scenario overlay state";

			// Act
			const branch = generateBranchName({ prompt });

			// Assert
			expect(branch).toBe("refactor/interactive-scenario-overlay-state");
		});

		it("handles fallback if no inputs given", () => {
			// Arrange & Act
			const branch = generateBranchName({});

			// Assert
			expect(branch.startsWith("feat/agent-task-")).toBe(true);
		});
	});

	describe("formatCommitMessage", () => {
		it("preserves valid conventional commit message from title", () => {
			// Arrange
			const title =
				"feat(sandbox): 🏰 orchestrate autonomous coding agents with Sandcastle";

			// Act
			const msg = formatCommitMessage({ title });

			// Assert
			expect(msg).toBe(
				"feat(sandbox): 🏰 orchestrate autonomous coding agents with Sandcastle",
			);
		});

		it("formats conventional commit message from plain issue title with and without issue number", () => {
			// Arrange
			const titleFixWithNum = "Fix timeline audio sync bug";
			const titleFixWithoutNum = "Fix timeline audio sync bug";
			const titleFeatWithNum = "Add player shortcuts";
			const titleFeatWithoutNum = "Add player shortcuts";

			// Act
			const msgFixWithNum = formatCommitMessage({
				issueNumber: 42,
				title: titleFixWithNum,
			});
			const msgFixWithoutNum = formatCommitMessage({
				title: titleFixWithoutNum,
			});
			const msgFeatWithNum = formatCommitMessage({
				issueNumber: 10,
				title: titleFeatWithNum,
			});
			const msgFeatWithoutNum = formatCommitMessage({
				title: titleFeatWithoutNum,
			});

			// Assert
			expect(msgFixWithNum).toBe(
				"fix(core): 🐛 fix timeline audio sync bug (#42)",
			);
			expect(msgFixWithoutNum).toBe(
				"fix(core): 🐛 fix timeline audio sync bug",
			);
			expect(msgFeatWithNum).toBe("feat(core): ✨ add player shortcuts (#10)");
			expect(msgFeatWithoutNum).toBe("feat(core): ✨ add player shortcuts");
		});

		it("formats conventional commit message from prompt and fallback", () => {
			// Arrange
			const promptFeat = "Add unit tests for sandcastle";
			const promptFix = "Fix button alignment";

			// Act
			const msgFeat = formatCommitMessage({ prompt: promptFeat });
			const msgFix = formatCommitMessage({ prompt: promptFix });
			const fallbackMsg = formatCommitMessage({});

			// Assert
			expect(msgFeat).toBe("feat(core): ✨ add unit tests for sandcastle");
			expect(msgFix).toBe("fix(core): 🐛 fix button alignment");
			expect(fallbackMsg).toBe("feat(core): ✨ automated changes");
		});
	});

	describe("buildPrPayload", () => {
		it("builds PR payload for GitHub issue", () => {
			// Arrange
			const issue = {
				body: "Implement Sandcastle orchestration",
				number: 152,
				title:
					"feat(sandbox): 🏰 orchestrate autonomous coding agents with Sandcastle",
			};
			const branch = "feat/issue-152-sandcastle";

			// Act
			const payload = buildPrPayload({
				attempts: 1,
				branch,
				issue,
			});

			// Assert
			expect(payload.title).toBe(issue.title);
			expect(payload.body).toContain("Closes #152");
			expect(payload.body).toContain("Sandcastle Autonomous Agent");
			expect(payload.body).toContain("**Self-healing attempts**: 1");
		});

		it("builds PR payload for ad-hoc prompt and empty prompt fallback", () => {
			// Arrange
			const prompt = "Improve timeline precision";
			const branch = "feat/improve-timeline";

			// Act
			const payload = buildPrPayload({
				attempts: 2,
				branch,
				prompt,
			});
			const fallbackPayload = buildPrPayload({
				attempts: 1,
				branch,
			});

			// Assert
			expect(payload.title).toBe("feat(core): ✨ Improve timeline precision");
			expect(payload.body).toContain("Improve timeline precision");
			expect(payload.body).toContain("**Self-healing attempts**: 2");
			expect(fallbackPayload.title).toBe(
				"feat(core): ✨ Autonomous task execution",
			);
		});
	});
});
