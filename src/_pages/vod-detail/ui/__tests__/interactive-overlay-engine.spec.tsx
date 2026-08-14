import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
	InteractiveOverlayEngine,
	type MultipleChoiceScenario,
} from "../interactive-overlay-engine";

const scenario: MultipleChoiceScenario = {
	id: "scenario-1",
	inputConfig: {
		options: [
			{ id: "option-a", text: "Option A" },
			{ id: "option-b", text: "Option B" },
			{ id: "option-c", text: "Option C" },
			{ id: "option-d", text: "Option D" },
		],
	},
	moduleType: "STRATEGY",
	promptText: "What should the team do next?",
};

describe("InteractiveOverlayEngine", () => {
	it.each([
		["1", "option-a"],
		["2", "option-b"],
		["3", "option-c"],
		["4", "option-d"],
	])("selects the matching rendered choice for key %s", (key, optionId) => {
		// Arrange
		const onAnswer = vi.fn();
		render(
			<InteractiveOverlayEngine onAnswer={onAnswer} scenario={scenario} />,
		);

		// Act
		fireEvent.keyDown(window, { key });

		// Assert
		expect(onAnswer).toHaveBeenCalledWith(optionId);
	});

	it("shows a numbered shortcut badge on every rendered choice button", () => {
		// Arrange
		render(<InteractiveOverlayEngine onAnswer={vi.fn()} scenario={scenario} />);

		// Act
		const choices = screen.getAllByRole("button");

		// Assert
		expect(choices).toHaveLength(4);
		expect(choices[0].getAttribute("aria-keyshortcuts")).toBe("1");
		expect(choices[1].getAttribute("aria-keyshortcuts")).toBe("2");
		expect(choices[2].getAttribute("aria-keyshortcuts")).toBe("3");
		expect(choices[3].getAttribute("aria-keyshortcuts")).toBe("4");
		expect(screen.getByText("1")).toBeDefined();
		expect(screen.getByText("4")).toBeDefined();
	});
});
