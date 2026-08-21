import { describe, expect, it } from "vitest";
import {
	checkWaiverFile,
	type RouteAccessibilityWaiver,
	validateRouteAccessibilityWaivers,
} from "../check-accessibility-waivers";

describe("validateRouteAccessibilityWaivers", () => {
	it("returns valid when given an empty waiver list", () => {
		// Arrange
		const waivers: RouteAccessibilityWaiver[] = [];
		const now = new Date("2026-08-21T12:00:00Z");

		// Act
		const result = validateRouteAccessibilityWaivers(waivers, now);

		// Assert
		expect(result.isValid).toBe(true);
		expect(result.errors).toEqual([]);
	});

	it("returns valid for a properly formatted, unexpired waiver", () => {
		// Arrange
		const waivers: RouteAccessibilityWaiver[] = [
			{
				expires: "2026-09-01",
				issue: "https://github.com/jackmaders/watchpoint/issues/100",
				owner: "@jackw",
				reason: "Temporary third-party iframe accessibility limitation",
				route: "/vods/$id/session",
				ruleId: "frame-title",
				state: "default",
			},
		];
		const now = new Date("2026-08-21T12:00:00Z");

		// Act
		const result = validateRouteAccessibilityWaivers(waivers, now);

		// Assert
		expect(result.isValid).toBe(true);
		expect(result.errors).toEqual([]);
	});

	it("reports errors for missing fields or non-object entries", () => {
		// Arrange
		const malformed = [
			null,
			"not-an-object",
			{
				expires: "invalid-date",
				issue: "invalid-url",
				owner: "",
				reason: "",
				route: "",
				ruleId: "",
				state: "  ",
			},
		];
		const now = new Date("2026-08-21T12:00:00Z");

		// Act
		const result = validateRouteAccessibilityWaivers(malformed, now);

		// Assert
		expect(result.isValid).toBe(false);
		expect(result.errors.length).toBeGreaterThan(0);
	});

	it("flags expired waivers", () => {
		// Arrange
		const waivers: RouteAccessibilityWaiver[] = [
			{
				expires: "2026-08-01",
				issue: "https://github.com/jackmaders/watchpoint/issues/100",
				owner: "@jackw",
				reason: "Past issue",
				route: "/admin",
				ruleId: "color-contrast",
				state: "default",
			},
		];
		const now = new Date("2026-08-21T12:00:00Z");

		// Act
		const result = validateRouteAccessibilityWaivers(waivers, now);

		// Assert
		expect(result.isValid).toBe(false);
		expect(result.errors).toContain("waiver 1 expired on 2026-08-01");
	});

	it("flags invalid issue URLs", () => {
		// Arrange
		const waivers: RouteAccessibilityWaiver[] = [
			{
				expires: "2026-09-01",
				issue: "https://example.com/not-our-repo",
				owner: "@jackw",
				reason: "Some reason",
				route: "/admin",
				ruleId: "color-contrast",
				state: "default",
			},
		];
		const now = new Date("2026-08-21T12:00:00Z");

		// Act
		const result = validateRouteAccessibilityWaivers(waivers, now);

		// Assert
		expect(result.isValid).toBe(false);
		expect(result.errors).toContain(
			"waiver 1 issue must match https://github.com/jackmaders/watchpoint/issues/<id>",
		);
	});
});

describe("checkWaiverFile", () => {
	it("reads and validates a valid JSON waiver file", () => {
		// Arrange
		const content = JSON.stringify({
			waivers: [
				{
					expires: "2026-09-01",
					issue: "https://github.com/jackmaders/watchpoint/issues/100",
					owner: "@jackw",
					reason: "Valid reason",
					route: "/",
					ruleId: "region",
					state: "default",
				},
			],
		});
		const readFile = () => content;
		const now = new Date("2026-08-21T12:00:00Z");

		// Act
		const result = checkWaiverFile("fake-path.json", { now, readFile });

		// Assert
		expect(result.isValid).toBe(true);
		expect(result.waivers.length).toBe(1);
	});

	it("returns errors when file is missing or invalid JSON", () => {
		// Arrange
		const readFile = () => {
			throw new Error("File not found");
		};

		// Act
		const result = checkWaiverFile("non-existent.json", { readFile });

		// Assert
		expect(result.isValid).toBe(false);
		expect(result.errors[0]).toContain("Failed to read waiver file");
	});

	it("returns errors when JSON structure does not contain a waivers array", () => {
		// Arrange
		const readFile = () => JSON.stringify({ invalid: true });

		// Act
		const result = checkWaiverFile("bad-structure.json", { readFile });

		// Assert
		expect(result.isValid).toBe(false);
		expect(result.errors).toContain(
			"Waiver file must contain a top-level 'waivers' array",
		);
	});
});
