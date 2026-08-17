import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ModuleType } from "@/shared/db";
import { InteractiveOverlayEngine, ScenarioOverlay } from "../../index";
import type { ScenarioOverlayState } from "../../model/session-contract";

const options = [
	{ id: "opt_a", text: "Take the high ground" },
	{ id: "opt_b", text: "Rotate to spawn" },
];
const moduleTypes: ModuleType[] = [
	"STRATEGY",
	"TACTICS",
	"ULTIMATE",
	"COOLDOWN",
	"SPATIAL",
];

describe("InteractiveOverlayEngine", () => {
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
				inputConfig: { options },
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
