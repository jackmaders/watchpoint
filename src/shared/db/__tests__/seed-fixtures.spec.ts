import { describe, expect, it } from "vitest";
import { FIXTURE_IDS, getLocalFixtureScenarios } from "../seed-fixtures";

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
