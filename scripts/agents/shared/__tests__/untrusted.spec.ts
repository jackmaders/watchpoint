import * as github from "@actions/github";
import { describe, expect, it, vi } from "vitest";
import type { IssueContext } from "../../github";
import { LABELS } from "../../github";
import {
	escalateToHuman,
	escalateUntrustedPr,
	isTrustedAuthor,
	TRUSTED_AUTHOR_ASSOCIATIONS,
} from "../untrusted";

vi.mock("@actions/github");

function createIssueContext(): IssueContext {
	return {
		issueNumber: 42,
		octokit: github.getOctokit("fake-token"),
		owner: "jackmaders",
		repo: "watchpoint",
	};
}

describe("isTrustedAuthor", () => {
	it("returns true for OWNER, MEMBER, and COLLABORATOR", () => {
		// Arrange & Act & Assert
		for (const role of TRUSTED_AUTHOR_ASSOCIATIONS) {
			expect(isTrustedAuthor(role)).toBe(true);
		}
	});

	it("returns false for non-trusted or missing author associations", () => {
		// Arrange & Act & Assert
		expect(isTrustedAuthor("CONTRIBUTOR")).toBe(false);
		expect(isTrustedAuthor("FIRST_TIME_CONTRIBUTOR")).toBe(false);
		expect(isTrustedAuthor("NONE")).toBe(false);
		expect(isTrustedAuthor(null)).toBe(false);
		expect(isTrustedAuthor(undefined)).toBe(false);
	});
});

describe("escalateUntrustedPr", () => {
	it("transitions labels to review:escalated and posts default untrusted author comment", async () => {
		// Arrange
		const ctx = createIssueContext();
		const currentLabels = [LABELS.devNeeded, LABELS.reviewNeeded];
		const mockCreateComment = vi.fn().mockResolvedValue({});
		vi.mocked(ctx.octokit.rest.issues.createComment).mockImplementation(
			mockCreateComment,
		);

		// Act
		const nextLabels = await escalateUntrustedPr(ctx, currentLabels);

		// Assert
		expect(nextLabels).toEqual([LABELS.reviewEscalated]);
		expect(mockCreateComment).toHaveBeenCalledWith(
			expect.objectContaining({
				body: "<!-- bot-comment -->\n🚦 This PR is from an untrusted author, so automated PR mutation is disabled. A human must review it.",
				issue_number: 42,
			}),
		);
	});

	it("uses custom reason when provided", async () => {
		// Arrange
		const ctx = createIssueContext();
		const currentLabels = [LABELS.devNeeded];
		const mockCreateComment = vi.fn().mockResolvedValue({});
		vi.mocked(ctx.octokit.rest.issues.createComment).mockImplementation(
			mockCreateComment,
		);

		// Act
		const nextLabels = await escalateUntrustedPr(
			ctx,
			currentLabels,
			"Custom untrusted reason.",
		);

		// Assert
		expect(nextLabels).toEqual([LABELS.reviewEscalated]);
		expect(mockCreateComment).toHaveBeenCalledWith(
			expect.objectContaining({
				body: "<!-- bot-comment -->\nCustom untrusted reason.",
				issue_number: 42,
			}),
		);
	});
});

describe("escalateToHuman", () => {
	it("transitions labels to review:escalated and posts human review warning", async () => {
		// Arrange
		const ctx = createIssueContext();
		const currentLabels = [LABELS.devNeeded, LABELS.reviewNeeded];
		const mockCreateComment = vi.fn().mockResolvedValue({});
		vi.mocked(ctx.octokit.rest.issues.createComment).mockImplementation(
			mockCreateComment,
		);

		// Act
		const nextLabels = await escalateToHuman(
			ctx,
			currentLabels,
			"Quality check failed.",
		);

		// Assert
		expect(nextLabels).toEqual([LABELS.reviewEscalated]);
		expect(mockCreateComment).toHaveBeenCalledWith(
			expect.objectContaining({
				body: "<!-- bot-comment -->\n⚠️ **Human review required:** Quality check failed.",
				issue_number: 42,
			}),
		);
	});
});
