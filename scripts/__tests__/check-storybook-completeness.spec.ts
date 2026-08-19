import { describe, expect, it } from "vitest";
import { validateWaivers } from "../check-storybook-completeness";

describe("validateWaivers", () => {
	it("rejects incomplete, malformed, and expired waivers", () => {
		// Arrange
		const value = {
			waivers: [
				{ story: "shared-ui-button--default" },
				{
					expires: "2020-01-01",
					issue: "https://example.com/issue",
					owner: "team",
					reason: "false positive",
					ruleId: "color-contrast",
					story: "shared-ui-button--default",
				},
			],
		};

		// Act
		const errors = validateWaivers(value, new Date("2026-01-01T00:00:00.000Z"));

		// Assert
		expect(errors).toHaveLength(7);
	});

	it("accepts a complete, current Watchpoint waiver", () => {
		// Arrange
		const value = {
			waivers: [
				{
					expires: "2026-12-31",
					issue: "https://github.com/jackmaders/watchpoint/issues/274",
					owner: "accessibility guild",
					reason: "documented false positive",
					ruleId: "color-contrast",
					story: "shared-ui-button--default",
				},
			],
		};

		// Act
		const errors = validateWaivers(value, new Date("2026-01-01T00:00:00.000Z"));

		// Assert
		expect(errors).toEqual([]);
	});
});
