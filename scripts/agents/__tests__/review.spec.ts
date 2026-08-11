import { describe, expect, it } from "vitest";
import { parseDiff } from "../review";

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
});
