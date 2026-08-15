import { describe, expect, it } from "vitest";
import {
	RunnerAlreadyLockedError,
	RunnerLockError,
	WorktreeCleanupError,
	WorktreeCreationError,
} from "../errors";

describe("Worktree Errors", () => {
	describe("RunnerAlreadyLockedError", () => {
		it("formats message with branch and issue number", () => {
			// Arrange
			const lockData = {
				branch: "feat/test",
				issueNumber: 123,
				pid: 456,
				startedAt: "2026-08-15T00:00:00Z",
			};

			// Act
			const error = new RunnerAlreadyLockedError(lockData);

			// Assert
			expect(error.name).toBe("RunnerAlreadyLockedError");
			expect(error.lockData).toEqual(lockData);
			expect(error.message).toContain("PID 456");
			expect(error.message).toContain("branch: feat/test");
			expect(error.message).toContain("issue: #123");
		});

		it("formats message without branch or issue number when absent", () => {
			// Arrange
			const lockData = {
				pid: 789,
				startedAt: "2026-08-15T00:00:00Z",
			};

			// Act
			const error = new RunnerAlreadyLockedError(lockData);

			// Assert
			expect(error.message).toBe(
				"Runner lock is already held by PID 789 (started at 2026-08-15T00:00:00Z)",
			);
		});

		it("formats message with only branch or only issue number", () => {
			// Arrange
			const lockWithBranchOnly = {
				branch: "feat/solo",
				pid: 101,
				startedAt: "2026-08-15T00:00:00Z",
			};
			const lockWithIssueOnly = {
				issueNumber: 55,
				pid: 102,
				startedAt: "2026-08-15T00:00:00Z",
			};

			// Act
			const errorBranch = new RunnerAlreadyLockedError(lockWithBranchOnly);
			const errorIssue = new RunnerAlreadyLockedError(lockWithIssueOnly);

			// Assert
			expect(errorBranch.message).toContain("branch: feat/solo");
			expect(errorBranch.message).not.toContain("issue:");
			expect(errorIssue.message).toContain("issue: #55");
			expect(errorIssue.message).not.toContain("branch:");
		});
	});

	describe("WorktreeCreationError", () => {
		it("stores branch, path, and optional cause", () => {
			// Arrange
			const cause = new Error("inner error");

			// Act
			const error = new WorktreeCreationError(
				"feat/fail",
				"/repo/.sandcastle/worktrees/feat-fail",
				"git failed",
				cause,
			);

			// Assert
			expect(error.name).toBe("WorktreeCreationError");
			expect(error.branch).toBe("feat/fail");
			expect(error.worktreePath).toBe("/repo/.sandcastle/worktrees/feat-fail");
			expect(error.causeError).toBe(cause);
			expect(error.message).toContain(
				"Failed to create worktree for branch 'feat/fail'",
			);
		});
	});

	describe("WorktreeCleanupError", () => {
		it("stores worktree path and optional cause", () => {
			// Arrange
			const cause = new Error("inner cleanup error");

			// Act
			const error = new WorktreeCleanupError(
				"/repo/.sandcastle/worktrees/feat-fail",
				"cleanup failed",
				cause,
			);

			// Assert
			expect(error.name).toBe("WorktreeCleanupError");
			expect(error.worktreePath).toBe("/repo/.sandcastle/worktrees/feat-fail");
			expect(error.causeError).toBe(cause);
			expect(error.message).toContain(
				"Failed to clean up worktree at '/repo/.sandcastle/worktrees/feat-fail'",
			);
		});
	});

	describe("RunnerLockError", () => {
		it("stores message and optional cause", () => {
			// Arrange
			const cause = new Error("fs error");

			// Act
			const error = new RunnerLockError("lock error occurred", cause);

			// Assert
			expect(error.name).toBe("RunnerLockError");
			expect(error.causeError).toBe(cause);
			expect(error.message).toBe("lock error occurred");
		});
	});
});
