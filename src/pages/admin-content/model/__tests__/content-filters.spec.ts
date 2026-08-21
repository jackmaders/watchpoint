import { describe, expect, it } from "vitest";
import type { AdminVodItem } from "@/shared/db";
import { compareContentVods, matchesContentFilters } from "../content-filters";

const mockVods: AdminVodItem[] = [
	{
		createdAt: new Date("2026-01-01T12:00:00Z"),
		durationSeconds: 600,
		heroName: "Reinhardt",
		id: "vod_1",
		isPublished: true,
		mapName: "King's Row",
		rankTier: "GM",
		role: "TANK",
		scenarios: [{ id: "sc_1" }, { id: "sc_2" }],
		title: "GM Rein Guide",
		youtubeVideoId: "yt_rein",
	},
	{
		createdAt: new Date("2026-01-02T12:00:00Z"),
		durationSeconds: 900,
		heroName: "Tracer",
		id: "vod_2",
		isPublished: false,
		mapName: "Oasis",
		rankTier: "Top 500",
		role: "DAMAGE",
		scenarios: [{ id: "sc_3" }],
		title: "Tracer Dive",
		youtubeVideoId: "yt_tracer",
	},
];

describe("content-filters", () => {
	it("matchesContentFilters filters by status, role, and search", () => {
		// Arrange & Act
		const matchAll = matchesContentFilters(
			mockVods[0] as AdminVodItem,
			"ALL",
			"ALL",
			"",
		);
		const matchPublished = matchesContentFilters(
			mockVods[0] as AdminVodItem,
			"PUBLISHED",
			"ALL",
			"",
		);
		const matchDraftFail = matchesContentFilters(
			mockVods[0] as AdminVodItem,
			"DRAFT",
			"ALL",
			"",
		);
		const matchRole = matchesContentFilters(
			mockVods[0] as AdminVodItem,
			"ALL",
			"TANK",
			"",
		);
		const matchRoleFail = matchesContentFilters(
			mockVods[0] as AdminVodItem,
			"ALL",
			"DAMAGE",
			"",
		);
		const matchSearch = matchesContentFilters(
			mockVods[0] as AdminVodItem,
			"ALL",
			"ALL",
			"Rein",
		);
		const matchSearchFail = matchesContentFilters(
			mockVods[0] as AdminVodItem,
			"ALL",
			"ALL",
			"nonexistent",
		);

		// Assert
		expect(matchAll).toBe(true);
		expect(matchPublished).toBe(true);
		expect(matchDraftFail).toBe(false);
		expect(matchRole).toBe(true);
		expect(matchRoleFail).toBe(false);
		expect(matchSearch).toBe(true);
		expect(matchSearchFail).toBe(false);
	});

	it("compareContentVods compares correctly for all columns and directions", () => {
		// Arrange
		const a = mockVods[0] as AdminVodItem;
		const b = mockVods[1] as AdminVodItem;

		// Act & Assert
		expect(compareContentVods(a, b, "title", "asc")).toBeLessThan(0);
		expect(compareContentVods(a, b, "title", "desc")).toBeGreaterThan(0);
		expect(compareContentVods(a, b, "heroName", "asc")).toBeLessThan(0);
		expect(compareContentVods(a, b, "role", "asc")).toBeGreaterThan(0);
		expect(compareContentVods(a, b, "mapName", "asc")).toBeLessThan(0);
		expect(compareContentVods(a, b, "durationSeconds", "asc")).toBeLessThan(0);
		expect(compareContentVods(a, b, "scenarioCount", "asc")).toBeGreaterThan(0);
		expect(compareContentVods(a, b, "isPublished", "asc")).toBeGreaterThan(0);
		expect(compareContentVods(a, b, "createdAt", "asc")).toBeLessThan(0);
		expect(compareContentVods(a, a, "title", "asc")).toBe(0);

		// Assert undefined scenarios handling
		const vodNoScenarios = {
			...a,
			id: "vod_no_sc",
			scenarios: undefined as unknown as [],
		};
		expect(
			compareContentVods(
				vodNoScenarios as AdminVodItem,
				a,
				"scenarioCount",
				"asc",
			),
		).toBeLessThan(0);
	});
});
