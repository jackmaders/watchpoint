import { describe, expect, it } from "vitest";
import {
	calculateModuleCounts,
	filterScenariosByModules,
	getModuleBadge,
	getModuleDefinition,
	getModuleDescription,
	getModuleLabel,
	isModuleType,
	parseModuleTypes,
} from "../module-helpers";

describe("module-helpers", () => {
	it("checks whether value is a valid ModuleType", () => {
		// Arrange & Act & Assert
		expect(isModuleType("STRATEGY")).toBe(true);
		expect(isModuleType("INVALID")).toBe(false);
		expect(isModuleType(123)).toBe(false);
		expect(isModuleType(null)).toBe(false);
	});

	it("retrieves module definition, label, badge, and description", () => {
		// Arrange & Act & Assert
		expect(getModuleDefinition("STRATEGY")).toBeDefined();
		expect(getModuleDefinition("INVALID")).toBeUndefined();
		expect(getModuleLabel("STRATEGY")).toBe("Strategy");
		expect(getModuleBadge("STRATEGY")).toContain("bg-primary");
		expect(getModuleDescription("STRATEGY")).toContain("positioning");

		// Unmapped / fallback
		expect(getModuleLabel("CUSTOM" as never)).toBe("CUSTOM");
		expect(getModuleBadge("CUSTOM" as never)).toBe("");
		expect(getModuleDescription("CUSTOM" as never)).toBe("");
	});

	it("calculates module counts for a scenario list", () => {
		// Arrange
		const scenarios = [
			{ moduleType: "STRATEGY" as const },
			{ moduleType: "STRATEGY" as const },
			{ moduleType: "TACTICS" as const },
			{ moduleType: "UNKNOWN_MODULE" as never },
		];

		// Act
		const counts = calculateModuleCounts(scenarios);

		// Assert
		expect(counts.STRATEGY).toBe(2);
		expect(counts.TACTICS).toBe(1);
		expect(counts.ULTIMATE).toBe(0);
	});

	it("filters scenarios by active modules (Set or Array)", () => {
		// Arrange
		const scenarios = [
			{ id: 1, moduleType: "STRATEGY" as const },
			{ id: 2, moduleType: "TACTICS" as const },
			{ id: 3, moduleType: "ULTIMATE" as const },
		];

		// Act
		const resArray = filterScenariosByModules(scenarios, [
			"STRATEGY",
			"ULTIMATE",
		]);
		const resSet = filterScenariosByModules(
			scenarios,
			new Set(["TACTICS" as const]),
		);

		// Assert
		expect(resArray.map((s) => s.id)).toEqual([1, 3]);
		expect(resSet.map((s) => s.id)).toEqual([2]);
	});

	it("parses module types from string, array, or null", () => {
		// Arrange & Act & Assert
		expect(parseModuleTypes("STRATEGY, TACTICS, INVALID")).toEqual([
			"STRATEGY",
			"TACTICS",
		]);
		expect(parseModuleTypes(["STRATEGY", "ULTIMATE", "INVALID"])).toEqual([
			"STRATEGY",
			"ULTIMATE",
		]);
		expect(parseModuleTypes(null)).toEqual([]);
		expect(parseModuleTypes(undefined)).toEqual([]);
		expect(parseModuleTypes(123 as never)).toEqual([]);
	});
});
