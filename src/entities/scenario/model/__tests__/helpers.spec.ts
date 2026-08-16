import { describe, expect, it } from "vitest";
import type { ModuleType } from "@/shared/db";
import {
	calculateModuleCounts,
	filterScenariosByModules,
	getModuleBadge,
	getModuleDefinition,
	getModuleDescription,
	getModuleLabel,
	isModuleType,
	parseModuleTypes,
} from "../helpers";

describe("scenario domain helpers", () => {
	describe("isModuleType", () => {
		it("returns true for all valid ModuleType values", () => {
			// Arrange
			const validModules: ModuleType[] = [
				"STRATEGY",
				"TACTICS",
				"ULTIMATE",
				"COOLDOWN",
				"SPATIAL",
			];

			// Act
			const results = validModules.map((mod) => isModuleType(mod));

			// Assert
			for (const result of results) {
				expect(result).toBe(true);
			}
		});

		it("returns false for invalid strings, null, undefined, and non-string types", () => {
			// Arrange
			const invalidInputs = [
				"INVALID",
				"strategy",
				"",
				null,
				undefined,
				123,
				{},
				[],
				true,
			];

			// Act
			const results = invalidInputs.map((input) => isModuleType(input));

			// Assert
			for (const result of results) {
				expect(result).toBe(false);
			}
		});
	});

	describe("getModuleDefinition", () => {
		it("returns the corresponding definition for a valid ModuleType", () => {
			// Arrange
			const key: ModuleType = "ULTIMATE";

			// Act
			const def = getModuleDefinition(key);

			// Assert
			expect(def).toEqual({
				badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
				color: "bg-amber-500/20 text-amber-300 border-amber-500/30",
				description: "Enemy ultimate charge range estimation",
				key: "ULTIMATE",
				label: "Ultimate Tracking",
				tooltip: "Enemy ultimate charge range estimation",
			});
		});

		it("returns undefined for an unknown module key", () => {
			// Arrange
			const invalidKey = "NOT_A_MODULE" as ModuleType;

			// Act
			const def = getModuleDefinition(invalidKey);

			// Assert
			expect(def).toBeUndefined();
		});
	});

	describe("getModuleLabel", () => {
		it("returns the human-readable label for a module type", () => {
			// Arrange
			const moduleType: ModuleType = "STRATEGY";

			// Act
			const label = getModuleLabel(moduleType);

			// Assert
			expect(label).toBe("Strategy");
		});

		it("returns the correct labels across all domain modules", () => {
			// Arrange
			const inputs: ModuleType[] = [
				"TACTICS",
				"ULTIMATE",
				"COOLDOWN",
				"SPATIAL",
			];

			// Act
			const labels = inputs.map((type) => getModuleLabel(type));

			// Assert
			expect(labels).toEqual([
				"Tactics",
				"Ultimate Tracking",
				"Cooldown Tracking",
				"Spatial Awareness",
			]);
		});

		it("falls back to the key string if module type is not in registry", () => {
			// Arrange
			const unknownType = "CUSTOM" as ModuleType;

			// Act
			const label = getModuleLabel(unknownType);

			// Assert
			expect(label).toBe("CUSTOM");
		});
	});

	describe("getModuleBadge", () => {
		it("returns badge classes for a module type", () => {
			// Arrange
			const moduleType: ModuleType = "TACTICS";

			// Act
			const badge = getModuleBadge(moduleType);

			// Assert
			expect(badge).toBe(
				"bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
			);
		});

		it("returns empty string if module type is not in registry", () => {
			// Arrange
			const unknownType = "CUSTOM" as ModuleType;

			// Act
			const badge = getModuleBadge(unknownType);

			// Assert
			expect(badge).toBe("");
		});
	});

	describe("getModuleDescription", () => {
		it("returns description for a module type", () => {
			// Arrange
			const moduleType: ModuleType = "COOLDOWN";

			// Act
			const description = getModuleDescription(moduleType);

			// Assert
			expect(description).toBe(
				"Ability availability & cooldown window tracking",
			);
		});

		it("returns empty string if module type is not in registry", () => {
			// Arrange
			const unknownType = "CUSTOM" as ModuleType;

			// Act
			const description = getModuleDescription(unknownType);

			// Assert
			expect(description).toBe("");
		});
	});

	describe("calculateModuleCounts", () => {
		it("counts scenarios for each module type and defaults missing modules to 0", () => {
			// Arrange
			const scenarios: { moduleType: ModuleType }[] = [
				{ moduleType: "STRATEGY" },
				{ moduleType: "STRATEGY" },
				{ moduleType: "TACTICS" },
				{ moduleType: "ULTIMATE" },
				{ moduleType: "COOLDOWN" },
			];

			// Act
			const counts = calculateModuleCounts(scenarios);

			// Assert
			expect(counts).toEqual({
				COOLDOWN: 1,
				SPATIAL: 0,
				STRATEGY: 2,
				TACTICS: 1,
				ULTIMATE: 1,
			});
		});

		it("returns 0 for all modules when scenarios array is empty", () => {
			// Arrange
			const scenarios: { moduleType: ModuleType }[] = [];

			// Act
			const counts = calculateModuleCounts(scenarios);

			// Assert
			expect(counts).toEqual({
				COOLDOWN: 0,
				SPATIAL: 0,
				STRATEGY: 0,
				TACTICS: 0,
				ULTIMATE: 0,
			});
		});

		it("ignores scenarios with unrecognized moduleType when counting", () => {
			// Arrange
			const scenarios = [
				{ moduleType: "STRATEGY" as ModuleType },
				{ moduleType: "UNKNOWN" as unknown as ModuleType },
			];

			// Act
			const counts = calculateModuleCounts(scenarios);

			// Assert
			expect(counts).toEqual({
				COOLDOWN: 0,
				SPATIAL: 0,
				STRATEGY: 1,
				TACTICS: 0,
				ULTIMATE: 0,
			});
		});
	});

	describe("filterScenariosByModules", () => {
		it("filters scenarios based on an array of active module types", () => {
			// Arrange
			const scenarios = [
				{ id: "s1", moduleType: "STRATEGY" as ModuleType },
				{ id: "s2", moduleType: "TACTICS" as ModuleType },
				{ id: "s3", moduleType: "SPATIAL" as ModuleType },
			];
			const activeModules: ModuleType[] = ["STRATEGY", "SPATIAL"];

			// Act
			const filtered = filterScenariosByModules(scenarios, activeModules);

			// Assert
			expect(filtered).toEqual([
				{ id: "s1", moduleType: "STRATEGY" },
				{ id: "s3", moduleType: "SPATIAL" },
			]);
		});

		it("filters scenarios based on a Set of active module types", () => {
			// Arrange
			const scenarios = [
				{ id: "s1", moduleType: "STRATEGY" as ModuleType },
				{ id: "s2", moduleType: "TACTICS" as ModuleType },
				{ id: "s3", moduleType: "ULTIMATE" as ModuleType },
			];
			const activeModules = new Set<ModuleType>(["TACTICS"]);

			// Act
			const filtered = filterScenariosByModules(scenarios, activeModules);

			// Assert
			expect(filtered).toEqual([{ id: "s2", moduleType: "TACTICS" }]);
		});

		it("returns empty array when active modules is empty", () => {
			// Arrange
			const scenarios = [{ id: "s1", moduleType: "STRATEGY" as ModuleType }];
			const activeModules: ModuleType[] = [];

			// Act
			const filtered = filterScenariosByModules(scenarios, activeModules);

			// Assert
			expect(filtered).toEqual([]);
		});
	});

	describe("parseModuleTypes", () => {
		it("parses comma-separated string containing valid module types", () => {
			// Arrange
			const raw = "STRATEGY,TACTICS,INVALID,COOLDOWN";

			// Act
			const parsed = parseModuleTypes(raw);

			// Assert
			expect(parsed).toEqual(["STRATEGY", "TACTICS", "COOLDOWN"]);
		});

		it("parses array of strings filtering out invalid entries", () => {
			// Arrange
			const raw = ["STRATEGY", "SPATIAL", "UNKNOWN"];

			// Act
			const parsed = parseModuleTypes(raw);

			// Assert
			expect(parsed).toEqual(["STRATEGY", "SPATIAL"]);
		});

		it("returns empty array for empty string, null, undefined, or non-array/string values", () => {
			// Arrange
			const emptyStr = "";
			const nullVal = null;
			const undefinedVal = undefined;
			const numberVal = 123 as unknown as string;

			// Act
			const fromEmpty = parseModuleTypes(emptyStr);
			const fromNull = parseModuleTypes(nullVal);
			const fromUndefined = parseModuleTypes(undefinedVal);
			const fromNumber = parseModuleTypes(numberVal);

			// Assert
			expect(fromEmpty).toEqual([]);
			expect(fromNull).toEqual([]);
			expect(fromUndefined).toEqual([]);
			expect(fromNumber).toEqual([]);
		});
	});
});
