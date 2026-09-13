/**
 * Tests scenario timestamp swapping logic for timeline reordering.
 */

import { describe, expect, it } from "vitest";
import { swapScenarios } from "../swap-scenarios";
import type { ScenarioItem } from "../types";

describe("swapScenarios", () => {
	const scenarios: ScenarioItem[] = [
		{
			explanationText: "1",
			id: "s-1",
			imageUrl: null,
			inputConfig: {},
			inputType: "MULTIPLE_CHOICE",
			moduleType: "COOLDOWN",
			promptText: "1",
			timeLimitSeconds: null,
			timestampSeconds: 10,
			vodId: "v-1",
		},
		{
			explanationText: "2",
			id: "s-2",
			imageUrl: null,
			inputConfig: {},
			inputType: "MULTIPLE_CHOICE",
			moduleType: "COOLDOWN",
			promptText: "2",
			timeLimitSeconds: null,
			timestampSeconds: 20,
			vodId: "v-1",
		},
		{
			explanationText: "3",
			id: "s-3",
			imageUrl: null,
			inputConfig: {},
			inputType: "MULTIPLE_CHOICE",
			moduleType: "COOLDOWN",
			promptText: "3",
			timeLimitSeconds: null,
			timestampSeconds: 30,
			vodId: "v-1",
		},
	];

	it("returns null if scenario is not found", () => {
		expect(swapScenarios(scenarios, "unknown", "up")).toBeNull();
	});

	it("returns null if moving first scenario up", () => {
		expect(swapScenarios(scenarios, "s-1", "up")).toBeNull();
	});

	it("returns null if moving last scenario down", () => {
		expect(swapScenarios(scenarios, "s-3", "down")).toBeNull();
	});

	it("swaps timestamps when moving up", () => {
		const result = swapScenarios(scenarios, "s-2", "up");
		expect(result).not.toBeNull();
		expect(result?.[0]?.id).toBe("s-2");
		expect(result?.[0]?.timestampSeconds).toBe(10);
		expect(result?.[1]?.id).toBe("s-1");
		expect(result?.[1]?.timestampSeconds).toBe(20);
	});

	it("swaps timestamps when moving down", () => {
		const result = swapScenarios(scenarios, "s-2", "down");
		expect(result).not.toBeNull();
		expect(result?.[1]?.id).toBe("s-3");
		expect(result?.[1]?.timestampSeconds).toBe(20);
		expect(result?.[2]?.id).toBe("s-2");
		expect(result?.[2]?.timestampSeconds).toBe(30);
	});
});
