import { describe, expect, it } from "vitest";
import type { ModuleType } from "@/shared/db";
import {
	DEFAULT_MODULE_TYPES,
	MODULE_DEFINITIONS,
	MODULE_MAP,
} from "../modules";

describe("scenario module registry", () => {
	it("contains exactly 5 domain module definitions", () => {
		// Arrange
		const expectedLength = 5;

		// Act
		const definitions = MODULE_DEFINITIONS;

		// Assert
		expect(definitions).toHaveLength(expectedLength);
	});

	it("defines accurate metadata for Strategy module", () => {
		// Arrange
		const expectedStrategy = {
			badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
			color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
			description: "Pre-fight positioning & composition win conditions",
			key: "STRATEGY",
			label: "Strategy",
			tooltip: "Pre-fight positioning & composition win conditions",
		};

		// Act
		const strategyDef = MODULE_MAP.STRATEGY;

		// Assert
		expect(strategyDef).toEqual(expectedStrategy);
	});

	it("defines accurate metadata for Tactics module", () => {
		// Arrange
		const expectedTactics = {
			badge: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
			color: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
			description: "Mid-fight execution & 3s rapid target selection",
			key: "TACTICS",
			label: "Tactics",
			tooltip: "Mid-fight execution & 3s rapid target selection",
		};

		// Act
		const tacticsDef = MODULE_MAP.TACTICS;

		// Assert
		expect(tacticsDef).toEqual(expectedTactics);
	});

	it("defines accurate metadata for Ultimate Tracking module", () => {
		// Arrange
		const expectedUltimate = {
			badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
			color: "bg-amber-500/20 text-amber-300 border-amber-500/30",
			description: "Enemy ultimate charge range estimation",
			key: "ULTIMATE",
			label: "Ultimate Tracking",
			tooltip: "Enemy ultimate charge range estimation",
		};

		// Act
		const ultimateDef = MODULE_MAP.ULTIMATE;

		// Assert
		expect(ultimateDef).toEqual(expectedUltimate);
	});

	it("defines accurate metadata for Cooldown Tracking module", () => {
		// Arrange
		const expectedCooldown = {
			badge: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
			color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
			description: "Ability availability & cooldown window tracking",
			key: "COOLDOWN",
			label: "Cooldown Tracking",
			tooltip: "Ability availability & cooldown window tracking",
		};

		// Act
		const cooldownDef = MODULE_MAP.COOLDOWN;

		// Assert
		expect(cooldownDef).toEqual(expectedCooldown);
	});

	it("defines accurate metadata for Spatial Awareness module", () => {
		// Arrange
		const expectedSpatial = {
			badge: "bg-purple-500/20 text-purple-300 border-purple-500/30",
			color: "bg-purple-500/20 text-purple-300 border-purple-500/30",
			description: "Flank recognition & situational location assessment",
			key: "SPATIAL",
			label: "Spatial Awareness",
			tooltip: "Flank recognition & situational location assessment",
		};

		// Act
		const spatialDef = MODULE_MAP.SPATIAL;

		// Assert
		expect(spatialDef).toEqual(expectedSpatial);
	});

	it("provides all default module type keys in domain order", () => {
		// Arrange
		const expectedOrder: ModuleType[] = [
			"STRATEGY",
			"TACTICS",
			"ULTIMATE",
			"COOLDOWN",
			"SPATIAL",
		];

		// Act
		const types = DEFAULT_MODULE_TYPES;

		// Assert
		expect(types).toEqual(expectedOrder);
	});

	it("ensures MODULE_MAP has an entry for each definition in MODULE_DEFINITIONS", () => {
		// Arrange
		const expectedKeys: ModuleType[] = [
			"STRATEGY",
			"TACTICS",
			"ULTIMATE",
			"COOLDOWN",
			"SPATIAL",
		];

		// Act
		const mappedKeys = expectedKeys.map((key) => MODULE_MAP[key].key);

		// Assert
		expect(mappedKeys).toEqual(expectedKeys);
	});
});
