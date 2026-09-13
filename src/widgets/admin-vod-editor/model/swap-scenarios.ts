/**
 * Pure utility function to swap scenario timestamps for optimistic timeline reordering.
 *
 * Implements `swapScenarios` returning updated array with swapped timestampSeconds, or null if invalid.
 */

import type { ScenarioItem } from "./types";

export function swapScenarios(
	scenariosList: ScenarioItem[],
	scenarioId: string,
	direction: "up" | "down",
) {
	const index = scenariosList.findIndex((s) => s.id === scenarioId);
	if (index === -1) return null;
	if (direction === "up" && index === 0) return null;
	if (direction === "down" && index === scenariosList.length - 1) return null;

	const targetIndex = direction === "up" ? index - 1 : index + 1;
	const updated = [...scenariosList];
	const current = updated[index];
	const target = updated[targetIndex];
	/* v8 ignore next */
	if (!current || !target) return null;

	const tempTimestamp = current.timestampSeconds;
	updated[index] = { ...target, timestampSeconds: tempTimestamp };
	updated[targetIndex] = {
		...current,
		timestampSeconds: target.timestampSeconds,
	};
	return updated;
}
