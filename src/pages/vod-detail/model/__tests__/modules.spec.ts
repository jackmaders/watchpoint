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
			badge: "bg-primary/10 text-primary border-primary/40",
			color: "bg-primary/10 text-primary border-primary/40",
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
			badge: "bg-accent text-accent-foreground border-border",
			color: "bg-accent text-accent-foreground border-border",
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
			badge: "bg-secondary text-secondary-foreground border-border",
			color: "bg-secondary text-secondary-foreground border-border",
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
			badge: "bg-muted text-muted-foreground border-border",
			color: "bg-muted text-muted-foreground border-border",
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
			badge: "bg-card text-card-foreground border-border",
			color: "bg-card text-card-foreground border-border",
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
