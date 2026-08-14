import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { type SessionScenario, VodSessionClient } from "../vod-session-client";

const scenarios: SessionScenario[] = [
	{
		explanationText: "Take the high ground before the fight begins.",
		id: "scenario-1",
		inputConfig: {
			options: [
				{ id: "option-a", isCorrect: true, text: "Take high ground" },
				{ id: "option-b", isCorrect: false, text: "Push main" },
			],
		},
		inputType: "MULTIPLE_CHOICE",
		moduleType: "STRATEGY",
		promptText: "Where should the team position?",
	},
	{
		explanationText: "Wait for the cooldown window.",
		id: "scenario-2",
		inputConfig: {
			options: [
				{ id: "option-c", isCorrect: true, text: "Wait" },
				{ id: "option-d", isCorrect: false, text: "Engage" },
			],
		},
		inputType: "MULTIPLE_CHOICE",
		moduleType: "TACTICS",
		promptText: "What is the next action?",
	},
];

describe("VodSessionClient", () => {
	it("evaluates a keyboard answer through the active Scenario flow", () => {
		// Arrange
		render(<VodSessionClient scenarios={scenarios} />);

		// Act
		fireEvent.keyDown(window, { key: "1" });

		// Assert
		expect(screen.getByText("PASS")).toBeDefined();
		expect(
			screen.getByText("Take the high ground before the fight begins."),
		).toBeDefined();
	});

	it("advances to the next Scenario after the answer is reviewed", () => {
		// Arrange
		render(<VodSessionClient scenarios={scenarios} />);

		// Act
		fireEvent.click(screen.getByRole("button", { name: /take high ground/i }));
		fireEvent.click(screen.getByRole("button", { name: /next scenario/i }));

		// Assert
		expect(screen.getByText("What is the next action?")).toBeDefined();
		expect(screen.queryByText("PASS")).toBeNull();
	});

	it("reports the selected Scenario answer through the shared callback", () => {
		// Arrange
		const onAnswer = vi.fn();
		render(<VodSessionClient onAnswer={onAnswer} scenarios={scenarios} />);

		// Act
		fireEvent.keyDown(window, { key: "1" });

		// Assert
		expect(onAnswer).toHaveBeenCalledWith("scenario-1", "option-a", true);
	});

	it("reports when the Session Manifest has no active Scenarios", () => {
		// Arrange
		const onAnswer = vi.fn();

		// Act
		render(<VodSessionClient onAnswer={onAnswer} scenarios={[]} />);

		// Assert
		expect(screen.getByText("No active Scenarios")).toBeDefined();
		expect(onAnswer).not.toHaveBeenCalled();
	});
});
