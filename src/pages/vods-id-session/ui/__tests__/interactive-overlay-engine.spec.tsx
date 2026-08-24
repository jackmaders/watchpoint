import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ModuleType } from "@/shared/db";
import {
	InteractiveOverlayEngine,
	normalizeScenarioInput,
	ScenarioOverlay,
} from "../../index";
import type { ScenarioOverlayState } from "../../model/session-contract";

const options = [
	{ id: "opt_a", is_correct: true, text: "Take the high ground" },
	{ id: "opt_b", is_correct: false, text: "Rotate to spawn" },
];
const fourOptions = [
	...options,
	{ id: "opt_c", is_correct: false, text: "Hold the corner" },
	{ id: "opt_d", is_correct: false, text: "Disengage completely" },
];
const moduleTypes: ModuleType[] = [
	"STRATEGY",
	"TACTICS",
	"ULTIMATE",
	"COOLDOWN",
	"SPATIAL",
];

describe("InteractiveOverlayEngine", () => {
	it.each([1, 2, 3, 4])(
		"associates the visible shortcut badge with each of %s rendered choices",
		(choiceCount) => {
			// Arrange
			const state: ScenarioOverlayState = { status: "unanswered" };

			// Act
			render(
				<InteractiveOverlayEngine
					onAnswer={vi.fn()}
					options={fourOptions.slice(0, choiceCount)}
					state={state}
				/>,
			);
			const buttons = screen.getAllByRole("button");

			// Assert
			buttons.forEach((button, index) => {
				expect(button.getAttribute("aria-keyshortcuts")).toBe(`${index + 1}`);
				expect(button.textContent).toContain(fourOptions[index].text);
				expect(within(button).getByText(`${index + 1}`)).toBeDefined();
			});
			expect(buttons).toHaveLength(choiceCount);
		},
	);

	it("renders the multiple-choice options and sends pointer activation through onAnswer", () => {
		// Arrange
		const onAnswer = vi.fn();
		const state: ScenarioOverlayState = { status: "unanswered" };

		// Act
		render(
			<InteractiveOverlayEngine
				onAnswer={onAnswer}
				options={options}
				state={state}
			/>,
		);
		fireEvent.click(
			screen.getByRole("button", { name: /Take the high ground/ }),
		);

		// Assert
		expect(onAnswer).toHaveBeenCalledWith("opt_a");
	});

	it.each(moduleTypes)(
		"routes pointer selection through the public overlay seam for %s scenarios",
		(moduleType) => {
			// Arrange
			const onSelectOption = vi.fn();
			const scenario = {
				explanationText: "The first option creates the best opening.",
				id: `scenario-${moduleType.toLowerCase()}`,
				input: normalizeScenarioInput("MULTIPLE_CHOICE", { options }),
				inputType: "MULTIPLE_CHOICE" as const,
				moduleType,
				promptText: `${moduleType} decision point`,
				timeLimitSeconds: null,
			};
			const state: ScenarioOverlayState = { status: "unanswered" };

			// Act
			render(
				<ScenarioOverlay
					onResume={vi.fn()}
					onSelectOption={onSelectOption}
					scenario={scenario}
					state={state}
				/>,
			);
			fireEvent.click(
				screen.getByRole("button", { name: /Take the high ground/ }),
			);

			// Assert
			expect(onSelectOption).toHaveBeenCalledWith("opt_a");
		},
	);
});
