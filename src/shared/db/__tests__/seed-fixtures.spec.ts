import { describe, expect, it } from "vitest";
import {
	FIXTURE_IDS,
	getLocalFixtureScenarios,
	getLocalFixtureVod,
} from "../seed-fixtures";

describe("local seed fixtures", () => {
	it("defines stable local identifiers", () => {
		// Arrange

		// Act
		const ids = FIXTURE_IDS;

		// Assert
		expect(ids).toEqual({
			adminUser: "usr_local_admin",
			playerUser: "usr_local_player",
			vod: "vod_local_fixture",
		});
	});

	it("defines deterministic VOD fixture with hero and role attributes", () => {
		// Arrange

		// Act
		const vod = getLocalFixtureVod();

		// Assert
		expect(vod.id).toBe(FIXTURE_IDS.vod);
		expect(vod.heroName).toBe("Ana");
		expect(vod.role).toBe("SUPPORT");
		expect(vod.isPublished).toBe(true);
	});

	it("covers every V1 module with synthetic scenarios", () => {
		// Arrange

		// Act
		const scenarios = getLocalFixtureScenarios(FIXTURE_IDS.vod);

		// Assert
		expect(scenarios.map((scenario) => scenario.moduleType)).toEqual([
			"STRATEGY",
			"TACTICS",
			"ULTIMATE",
			"COOLDOWN",
			"SPATIAL",
		]);
	});
});
