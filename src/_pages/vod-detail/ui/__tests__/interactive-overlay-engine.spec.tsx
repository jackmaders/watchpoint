import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
	InteractiveOverlayEngine,
	type MultipleChoiceScenario,
} from "@/_pages/vod-detail";

const moduleTypes = [
	"STRATEGY",
	"TACTICS",
	"ULTIMATE",
	"COOLDOWN",
	"SPATIAL",
] as const;

const scenarios: MultipleChoiceScenario[] = moduleTypes.map((moduleType) => ({
	id: `scenario-${moduleType.toLowerCase()}`,
	inputConfig: {
		options: [
			{ id: `${moduleType.toLowerCase()}-choice`, text: "Take this action" },
		],
	},
	inputType: "MULTIPLE_CHOICE",
	moduleType,
	promptText: `${moduleType} decision`,
}));

describe("InteractiveOverlayEngine", () => {
	it.each(scenarios)(
		"renders and activates the existing choice for the $moduleType module",
		(scenario) => {
			// Arrange
			const onAnswer = vi.fn();
			render(
				<InteractiveOverlayEngine onAnswer={onAnswer} scenario={scenario} />,
			);

			// Act
			fireEvent.click(screen.getByRole("button", { name: "Take this action" }));

			// Assert
			expect(onAnswer).toHaveBeenCalledWith(
				`${scenario.moduleType.toLowerCase()}-choice`,
			);
		},
	);
});
