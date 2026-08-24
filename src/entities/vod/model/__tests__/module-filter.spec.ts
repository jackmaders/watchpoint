import { describe, expect, it } from "vitest";
import {
	buildSessionUrl,
	extractHeroFromTitle,
	serializeModulesParam,
} from "../module-filter";

describe("module-filter utilities", () => {
	it("extracts known Overwatch heroes from VOD title", () => {
		// Arrange & Act & Assert
		expect(extractHeroFromTitle("GM Ana Gameplay on King's Row")).toBe("Ana");
		expect(extractHeroFromTitle("Reinhardt Solo Queue Mastery")).toBe(
			"Reinhardt",
		);
		expect(extractHeroFromTitle("Unranked to GM No Hero Mentioned")).toBeNull();
	});

	it("serializes module types to comma separated param", () => {
		// Arrange & Act & Assert
		expect(serializeModulesParam(["STRATEGY", "TACTICS"])).toBe(
			"STRATEGY,TACTICS",
		);
	});

	it("builds session url with query parameters", () => {
		// Arrange & Act & Assert
		expect(buildSessionUrl("vod_1", ["STRATEGY"], "pt_123")).toBe(
			"/vods/vod_1/session?modules=STRATEGY&playthroughId=pt_123",
		);
		expect(buildSessionUrl("vod_1", ["STRATEGY"])).toBe(
			"/vods/vod_1/session?modules=STRATEGY",
		);
		expect(buildSessionUrl("vod_1", [])).toBe("#");
	});
});
