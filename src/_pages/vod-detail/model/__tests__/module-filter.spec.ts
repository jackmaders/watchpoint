import { describe, expect, it } from "vitest";
import type { ModuleType } from "@/shared/db";
import {
	buildSessionUrl,
	extractHeroFromTitle,
	serializeModulesParam,
} from "../module-filter";

describe("module-filter helpers", () => {
	describe("extractHeroFromTitle", () => {
		it("extracts Ana from standard title string", () => {
			// Arrange
			const title = "Grandmaster Ana VOD — King's Row Defense & Attack";

			// Act
			const hero = extractHeroFromTitle(title);

			// Assert
			expect(hero).toBe("Ana");
		});

		it("extracts Tracer from gameplay title string", () => {
			// Arrange
			const title = "Top 500 Tracer Gameplay - Oasis";

			// Act
			const hero = extractHeroFromTitle(title);

			// Assert
			expect(hero).toBe("Tracer");
		});

		it("extracts Reinhardt from guide title string", () => {
			// Arrange
			const title = "Diamond Reinhardt Guide - Eichenwalde";

			// Act
			const hero = extractHeroFromTitle(title);

			// Assert
			expect(hero).toBe("Reinhardt");
		});

		it("extracts recent heroes like D.Mon, Hazard, Juno, and Venture", () => {
			// Arrange
			const titleDMon = "Top 500 D.Mon VOD - Busan";
			const titleHazard = "Top 500 Hazard Tank Guide";
			const titleJuno = "GM Juno Support Gameplay";
			const titleVenture = "Venture DPS Rollouts - Dorado";

			// Act
			const heroDMon = extractHeroFromTitle(titleDMon);
			const heroHazard = extractHeroFromTitle(titleHazard);
			const heroJuno = extractHeroFromTitle(titleJuno);
			const heroVenture = extractHeroFromTitle(titleVenture);

			// Assert
			expect(heroDMon).toBe("D.Mon");
			expect(heroHazard).toBe("Hazard");
			expect(heroJuno).toBe("Juno");
			expect(heroVenture).toBe("Venture");
		});

		it("handles lowercase hero name in title", () => {
			// Arrange
			const title = "gm ana vod";

			// Act
			const hero = extractHeroFromTitle(title);

			// Assert
			expect(hero).toBe("Ana");
		});

		it("handles uppercase hero name in title", () => {
			// Arrange
			const title = "WIDOWMAKER Masterclass";

			// Act
			const hero = extractHeroFromTitle(title);

			// Assert
			expect(hero).toBe("Widowmaker");
		});

		it("returns null when no hero name is present in title", () => {
			// Arrange
			const title = "Competitive Ranked Game - King's Row";

			// Act
			const result = extractHeroFromTitle(title);

			// Assert
			expect(result).toBeNull();
		});
	});

	describe("serializeModulesParam", () => {
		it("serializes module array to comma-separated string", () => {
			// Arrange
			const modules: ModuleType[] = ["STRATEGY", "TACTICS", "SPATIAL"];

			// Act
			const serialized = serializeModulesParam(modules);

			// Assert
			expect(serialized).toBe("STRATEGY,TACTICS,SPATIAL");
		});

		it("returns empty string when modules array is empty", () => {
			// Arrange
			const modules: ModuleType[] = [];

			// Act
			const serialized = serializeModulesParam(modules);

			// Assert
			expect(serialized).toBe("");
		});
	});

	describe("buildSessionUrl", () => {
		it("builds session url with modules query param when modules are selected", () => {
			// Arrange
			const vodId = "vod_123";
			const modules: ModuleType[] = ["STRATEGY", "ULTIMATE"];

			// Act
			const url = buildSessionUrl(vodId, modules);

			// Assert
			expect(url).toBe("/vods/vod_123/session?modules=STRATEGY%2CULTIMATE");
		});

		it("returns '#' when no modules are selected", () => {
			// Arrange
			const vodId = "vod_123";
			const modules: ModuleType[] = [];

			// Act
			const url = buildSessionUrl(vodId, modules);

			// Assert
			expect(url).toBe("#");
		});
	});
});
