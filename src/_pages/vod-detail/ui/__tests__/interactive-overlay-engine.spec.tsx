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
	inputType: "MULTIPLE_CHOICE",
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

	it("uses the same answer callback for pointer and keyboard activation", () => {
		// Arrange
		const onAnswer = vi.fn();
		const { unmount } = render(
			<InteractiveOverlayEngine onAnswer={onAnswer} scenario={scenario} />,
		);

		// Act
		fireEvent.click(screen.getByRole("button", { name: /option b/i }));
		unmount();
		render(
			<InteractiveOverlayEngine onAnswer={onAnswer} scenario={scenario} />,
		);
		fireEvent.keyDown(window, { key: "2" });

		// Assert
		expect(onAnswer).toHaveBeenNthCalledWith(1, "option-b");
		expect(onAnswer).toHaveBeenNthCalledWith(2, "option-b");
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

	it("does not select an option that is not rendered", () => {
		// Arrange
		const onAnswer = vi.fn();
		const shortScenario = {
			...scenario,
			inputConfig: { options: scenario.inputConfig.options.slice(0, 2) },
		};
		render(
			<InteractiveOverlayEngine onAnswer={onAnswer} scenario={shortScenario} />,
		);

		// Act
		fireEvent.keyDown(window, { key: "3" });
		fireEvent.keyDown(window, { key: "4" });

		// Assert
		expect(onAnswer).not.toHaveBeenCalled();
	});

	it.each(["1", "x", "Enter"])(
		"leaves the answer state unchanged for non-shortcut key %s",
		(key) => {
			// Arrange
			const onAnswer = vi.fn();
			render(
				<InteractiveOverlayEngine onAnswer={onAnswer} scenario={scenario} />,
			);

			// Act
			if (key === "1") {
				fireEvent.keyDown(window, { key: "1" });
				fireEvent.keyDown(window, { key: "1" });
			} else {
				fireEvent.keyDown(window, { key });
			}

			// Assert
			expect(onAnswer).toHaveBeenCalledTimes(key === "1" ? 1 : 0);
		},
	);

	it.each(["input", "textarea", "select", "[contenteditable]"])(
		"keeps number keys in an input-capable %s control",
		(control) => {
			// Arrange
			const onAnswer = vi.fn();
			render(
				<>
					<InteractiveOverlayEngine onAnswer={onAnswer} scenario={scenario} />
					{control === "input" && <input data-testid="entry" />}
					{control === "textarea" && <textarea data-testid="entry" />}
					{control === "select" && <select data-testid="entry" />}
					{control === "[contenteditable]" && (
						<div contentEditable data-testid="entry" />
					)}
				</>,
			);
			const entry = screen.getByTestId("entry");

			// Act
			fireEvent.keyDown(entry, { key: "1" });

			// Assert
			expect(onAnswer).not.toHaveBeenCalled();
		},
	);

	it("ignores keyboard input when there is no active or answered Scenario", () => {
		// Arrange
		const onAnswer = vi.fn();
		render(
			<>
				<InteractiveOverlayEngine onAnswer={onAnswer} scenario={null} />
				<InteractiveOverlayEngine
					answered
					onAnswer={onAnswer}
					scenario={scenario}
				/>
			</>,
		);

		// Act
		fireEvent.keyDown(window, { key: "1" });

		// Assert
		expect(onAnswer).not.toHaveBeenCalled();
	});

	it("renders nothing for a non-multiple-choice Scenario input type", () => {
		// Arrange
		const nonMultipleChoiceScenario = {
			...scenario,
			inputType: "PERCENT_SLIDER" as const,
		};

		// Act
		render(
			<InteractiveOverlayEngine
				onAnswer={vi.fn()}
				scenario={nonMultipleChoiceScenario}
			/>,
		);

		// Assert
		expect(screen.queryAllByRole("button")).toHaveLength(0);
	});
});
