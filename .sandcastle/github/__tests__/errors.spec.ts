import { describe, expect, it } from "vitest";
import {
	ClaimVerificationError,
	GithubCliError,
	IssueAlreadyClaimedError,
	IssueNotFoundError,
	isClaimContention,
} from "../errors";

describe("GitHub Errors and Contention Helpers", () => {
	describe("GithubCliError", () => {
		it("constructs error with default message when no custom message or details provided", () => {
			// Arrange & Act
			const err = new GithubCliError({ exitCode: 1 });

			// Assert
			expect(err.name).toBe("GithubCliError");
			expect(err.message).toBe(
				"GitHub CLI command failed with exit code 1: no output",
			);
			expect(err.exitCode).toBe(1);
			expect(err.stderr).toBe("");
			expect(err.stdout).toBe("");
		});

		it("constructs error including command details", () => {
			// Arrange & Act
			const err = new GithubCliError({
				command: "gh issue list",
				exitCode: 2,
				stderr: "rate limited",
			});

			// Assert
			expect(err.message).toBe(
				"Command 'gh issue list' failed with exit code 2: rate limited",
			);
			expect(err.command).toBe("gh issue list");
			expect(err.stderr).toBe("rate limited");
		});

		it("uses explicit custom message if provided", () => {
			// Arrange & Act
			const err = new GithubCliError({
				exitCode: 1,
				message: "Custom error message",
			});

			// Assert
			expect(err.message).toBe("Custom error message");
		});
	});

	describe("IssueNotFoundError", () => {
		it("sets correct name, message, and issueNumber", () => {
			// Arrange & Act
			const err = new IssueNotFoundError(42);

			// Assert
			expect(err.name).toBe("IssueNotFoundError");
			expect(err.message).toBe("Issue #42 not found");
			expect(err.issueNumber).toBe(42);
		});
	});

	describe("IssueAlreadyClaimedError", () => {
		it("formats message with single assignee", () => {
			// Arrange & Act
			const err = new IssueAlreadyClaimedError(100, ["octocat"]);

			// Assert
			expect(err.name).toBe("IssueAlreadyClaimedError");
			expect(err.message).toBe("Issue #100 is already claimed by @octocat");
			expect(err.issueNumber).toBe(100);
			expect(err.assignees).toEqual(["octocat"]);
		});

		it("formats message with already prefixed @ assignee", () => {
			// Arrange & Act
			const err = new IssueAlreadyClaimedError(100, ["@octocat", "agent2"]);

			// Assert
			expect(err.message).toBe(
				"Issue #100 is already claimed by @octocat, @agent2",
			);
		});

		it("formats message without assignees", () => {
			// Arrange & Act
			const err = new IssueAlreadyClaimedError(100);

			// Assert
			expect(err.message).toBe("Issue #100 is already claimed");
		});
	});

	describe("ClaimVerificationError", () => {
		it("sets correct name, message, and properties", () => {
			// Arrange & Act
			const err = new ClaimVerificationError(200, "Unassigned in GitHub");

			// Assert
			expect(err.name).toBe("ClaimVerificationError");
			expect(err.message).toBe(
				"Claim verification failed for issue #200: Unassigned in GitHub",
			);
			expect(err.issueNumber).toBe(200);
			expect(err.reason).toBe("Unassigned in GitHub");
		});
	});

	describe("isClaimContention", () => {
		it("returns true for IssueAlreadyClaimedError instance", () => {
			// Arrange
			const err = new IssueAlreadyClaimedError(50);

			// Act & Assert
			expect(isClaimContention(err)).toBe(true);
		});

		it("returns true for string containing already claimed", () => {
			// Act & Assert
			expect(
				isClaimContention("Failed: Issue #123 is already claimed by user"),
			).toBe(true);
		});

		it("returns true for Error instance with already claimed message", () => {
			// Arrange
			const err = new Error("This ticket is ALREADY CLAIMED");

			// Act & Assert
			expect(isClaimContention(err)).toBe(true);
		});

		it("returns false for unrelated errors or objects", () => {
			// Act & Assert
			expect(isClaimContention(new Error("Network timeout"))).toBe(false);
			expect(isClaimContention("Some other string")).toBe(false);
			expect(isClaimContention(null)).toBe(false);
			expect(isClaimContention(undefined)).toBe(false);
			expect(isClaimContention({ error: "random" })).toBe(false);
		});
	});
});
