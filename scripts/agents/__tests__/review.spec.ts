import { describe, expect, it } from "vitest";
import {
	buildReviewBody,
	buildReviewPayload,
	parseDiff,
	parseOriginatingIssueNumber,
} from "../review";
import type { Review } from "../schemas";

describe("parseDiff", () => {
	it("maps right-side context and added lines to their file paths", () => {
		// Arrange
		const diff = [
			"diff --git a/src/example.ts b/src/example.ts",
			"--- a/src/example.ts",
			"+++ b/src/example.ts",
			"@@ -10,3 +10,4 @@",
			" context",
			"+added",
			" context after",
		].join("\n");

		// Act
		const lines = parseDiff(diff);

		// Assert
		expect(lines).toEqual(
			new Set(["src/example.ts:10", "src/example.ts:11", "src/example.ts:12"]),
		);
	});

	it("does not map deleted lines and keeps separate file hunks distinct", () => {
		// Arrange
		const diff = [
			"diff --git a/old.ts b/old.ts",
			"--- a/old.ts",
			"+++ b/old.ts",
			"@@ -1,2 +1,1 @@",
			"-deleted",
			"+replacement",
			"diff --git a/new.ts b/new.ts",
			"--- /dev/null",
			"+++ b/new.ts",
			"@@ -0,0 +1,1 @@",
			"+new line",
		].join("\n");

		// Act
		const lines = parseDiff(diff);

		// Assert
		expect(lines).toEqual(new Set(["old.ts:1", "new.ts:1"]));
	});
});

describe("parseOriginatingIssueNumber", () => {
	it("prefers a closing issue reference in the pull request body", () => {
		// Arrange
		const body = "Closes #42\n\nThis is the change.";

		// Act
		const issueNumber = parseOriginatingIssueNumber(
			body,
			"agent/issue-99-other",
		);

		// Assert
		expect(issueNumber).toBe(42);
	});

	it("falls back to the issue number in an agent branch", () => {
		// Arrange

		// Act
		const issueNumber = parseOriginatingIssueNumber(
			"No closing reference.",
			"agent/issue-99-two-axis-review",
		);

		// Assert
		expect(issueNumber).toBe(99);
	});

	it("returns null when no originating issue can be found", () => {
		// Arrange

		// Act
		const issueNumber = parseOriginatingIssueNumber(null, "feature/review");

		// Assert
		expect(issueNumber).toBeNull();
	});
});

describe("review composition", () => {
	function review(overrides: Partial<Review> = {}): Review {
		return {
			inlineComments: [],
			replies: [],
			summary: "No findings.",
			verdict: "approved",
			...overrides,
		};
	}

	it("keeps Standards and Spec reports under separate headings with drop counts", () => {
		// Arrange
		const standards = review({ summary: "Standards summary." });
		const spec = review({ summary: "Spec summary." });

		// Act
		const body = buildReviewBody(standards, 2, spec, 1);

		// Assert
		expect(body).toBe(
			"## Standards Review\n\n**Verdict:** approved\nStandards summary.\n\n*Inline comments: 0 posted, 2 dropped.*\n\n## Spec Review\n\n**Verdict:** approved\nSpec summary.\n\n*Inline comments: 0 posted, 1 dropped.*",
		);
	});

	it("requests changes when either independent axis requests changes", () => {
		// Arrange
		const standards = review();
		const spec = review({ verdict: "changes-requested" });

		// Act
		const payload = buildReviewPayload(standards, spec, [], []);

		// Assert
		expect(payload.event).toBe("REQUEST_CHANGES");
	});
});
