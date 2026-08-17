import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
	ScenarioData,
	ScenarioOverlayState,
} from "../../model/session-contract";
import { normalizeScenarioInput } from "../../model/session-contract";
import { ScenarioOverlay } from "../scenario-overlay";

const moduleTypes = [
	"STRATEGY",
	"TACTICS",
	"ULTIMATE",
	"COOLDOWN",
	"SPATIAL",
] as const;

describe("ScenarioOverlay", () => {
	const baseScenario: ScenarioData = {
		explanationText:
			"Ana used Sleep Dart aggressively 4s ago, leaving her vulnerable to dive.",
		id: "sc_1",
		imageUrl: null,
		input: normalizeScenarioInput("MULTIPLE_CHOICE", {
			options: [
				{ id: "opt_1", is_correct: true, text: "Dive Ana immediately" },
				{ id: "opt_2", is_correct: false, text: "Rotate to high ground" },
				{ id: "opt_3", is_correct: false, text: "Wait for Coalescence" },
				{ id: "opt_4", is_correct: false, text: "Fall back to point" },
			],
		}),
		inputType: "MULTIPLE_CHOICE",
		moduleType: "TACTICS",
		promptText: "Enemy Ana just missed Sleep Dart. What is your priority?",
		timeLimitSeconds: 3,
	};

	it("renders module badge, prompt text, and multiple-choice options with hotkey badges", () => {
		// Arrange
		const handleSelect = vi.fn();
		const handleResume = vi.fn();
		const state: ScenarioOverlayState = { status: "unanswered" };

		// Act
		render(
			<ScenarioOverlay
				onResume={handleResume}
				onSelectOption={handleSelect}
				scenario={baseScenario}
				state={state}
			/>,
		);
		const badge = screen.getByText("Tactics");
		const prompt = screen.getByText(
			"Enemy Ana just missed Sleep Dart. What is your priority?",
		);
		const option1 = screen.getByText("Dive Ana immediately");
		const key1 = screen.getByText("1");
		const key2 = screen.getByText("2");
		const key3 = screen.getByText("3");
		const key4 = screen.getByText("4");

		// Assert
		expect(badge).toBeDefined();
		expect(prompt).toBeDefined();
		expect(option1).toBeDefined();
		expect(key1).toBeDefined();
		expect(key2).toBeDefined();
		expect(key3).toBeDefined();
		expect(key4).toBeDefined();
	});

	it("renders scenario image when imageUrl is provided with accessible alt text", () => {
		// Arrange
		const scenarioWithImage: ScenarioData = {
			...baseScenario,
			imageUrl: "https://example.com/map-view.png",
			moduleType: "SPATIAL",
		};
		const state: ScenarioOverlayState = { status: "unanswered" };

		// Act
		render(
			<ScenarioOverlay
				onResume={vi.fn()}
				onSelectOption={vi.fn()}
				scenario={scenarioWithImage}
				state={state}
			/>,
		);
		const image = screen.getByRole("img", {
			name: /scenario tactical diagram/i,
		});

		// Assert
		expect(image).toBeDefined();
		expect(image.getAttribute("src")).toContain("map-view.png");
	});

	it("renders a safe fallback without controls for unsupported normalized inputs", () => {
		// Arrange
		const handleResume = vi.fn();
		const handleSelect = vi.fn();
		const unsupportedScenario: ScenarioData = {
			...baseScenario,
			input: normalizeScenarioInput("MAP_PIN_2D", { height: 100, width: 100 }),
			inputType: "MAP_PIN_2D",
		};
		const state: ScenarioOverlayState = { status: "unanswered" };

		// Act
		render(
			<ScenarioOverlay
				onResume={handleResume}
				onSelectOption={handleSelect}
				onSkipUnsupportedInput={handleResume}
				scenario={unsupportedScenario}
				state={state}
			/>,
		);
		fireEvent.keyDown(window, { key: "1" });
		fireEvent.click(screen.getByTestId("skip-unsupported-input-button"));

		// Assert
		expect(screen.getByTestId("unsupported-scenario-input")).toBeDefined();
		expect(screen.queryByRole("button", { name: /Dive Ana/i })).toBeNull();
		expect(handleSelect).not.toHaveBeenCalled();
		expect(handleResume).toHaveBeenCalledTimes(1);
	});

	it("does not render an image or empty image container when imageUrl is null", () => {
		// Arrange
		const state: ScenarioOverlayState = { status: "unanswered" };

		// Act
		render(
			<ScenarioOverlay
				onResume={vi.fn()}
				onSelectOption={vi.fn()}
				scenario={baseScenario}
				state={state}
			/>,
		);
		const image = screen.queryByRole("img", {
			name: /scenario tactical diagram/i,
		});

		// Assert
		expect(image).toBeNull();
	});

	it("calls onSelectOption when an option is clicked in unanswered state", () => {
		// Arrange
		const handleSelect = vi.fn();
		const state: ScenarioOverlayState = { status: "unanswered" };
		render(
			<ScenarioOverlay
				onResume={vi.fn()}
				onSelectOption={handleSelect}
				scenario={baseScenario}
				state={state}
			/>,
		);

		// Act
		fireEvent.click(screen.getByText("Dive Ana immediately"));

		// Assert
		expect(handleSelect).toHaveBeenCalledWith("opt_1");
	});

	it("triggers option selection when keyboard number hotkeys 1-4 are pressed during unanswered state", () => {
		// Arrange
		const handleSelect = vi.fn();
		const state: ScenarioOverlayState = { status: "unanswered" };
		render(
			<ScenarioOverlay
				onResume={vi.fn()}
				onSelectOption={handleSelect}
				scenario={baseScenario}
				state={state}
			/>,
		);

		// Act
		fireEvent.keyDown(window, { key: "2" });

		// Assert
		expect(handleSelect).toHaveBeenCalledWith("opt_2");
	});

	it.each(moduleTypes)(
		"routes number-row shortcuts 1-4 to rendered choices for %s scenarios",
		(moduleType) => {
			// Arrange
			const handleSelect = vi.fn();
			const scenario = { ...baseScenario, moduleType };
			const state: ScenarioOverlayState = { status: "unanswered" };
			render(
				<ScenarioOverlay
					onResume={vi.fn()}
					onSelectOption={handleSelect}
					scenario={scenario}
					state={state}
				/>,
			);

			// Act
			fireEvent.keyDown(window, { key: "1" });
			fireEvent.keyDown(window, { key: "2" });
			fireEvent.keyDown(window, { key: "3" });
			fireEvent.keyDown(window, { key: "4" });

			// Assert
			expect(handleSelect).toHaveBeenCalledTimes(4);
			expect(handleSelect).toHaveBeenNthCalledWith(1, "opt_1");
			expect(handleSelect).toHaveBeenNthCalledWith(2, "opt_2");
			expect(handleSelect).toHaveBeenNthCalledWith(3, "opt_3");
			expect(handleSelect).toHaveBeenNthCalledWith(4, "opt_4");
		},
	);

	it("does not activate an unmapped shortcut or a choice beyond the rendered options", () => {
		// Arrange
		const handleSelect = vi.fn();
		const fiveOptionScenario: ScenarioData = {
			...baseScenario,
			input: normalizeScenarioInput("MULTIPLE_CHOICE", {
				options: [
					...(baseScenario.input.kind === "multiple-choice"
						? baseScenario.input.options
						: []),
					{ id: "opt_5", is_correct: false, text: "Wait for backup" },
				],
			}),
		};
		render(
			<ScenarioOverlay
				onResume={vi.fn()}
				onSelectOption={handleSelect}
				scenario={fiveOptionScenario}
				state={{ status: "unanswered" }}
			/>,
		);

		// Act
		fireEvent.keyDown(window, { key: "5" });
		fireEvent.keyDown(window, { key: "1foo" });
		fireEvent.keyDown(window, { key: "Numpad1" });

		// Assert
		expect(screen.queryByTestId("scenario-option-opt_5")).toBeNull();
		expect(handleSelect).not.toHaveBeenCalled();
	});

	it("ignores shortcuts that are not rendered when fewer than four choices exist", () => {
		// Arrange
		const handleSelect = vi.fn();
		const twoOptionScenario: ScenarioData = {
			...baseScenario,
			input: normalizeScenarioInput("MULTIPLE_CHOICE", {
				options: [
					{ id: "opt_1", is_correct: true, text: "Dive Ana immediately" },
					{ id: "opt_2", is_correct: false, text: "Rotate to high ground" },
				],
			}),
		};
		render(
			<ScenarioOverlay
				onResume={vi.fn()}
				onSelectOption={handleSelect}
				scenario={twoOptionScenario}
				state={{ status: "unanswered" }}
			/>,
		);

		// Act
		fireEvent.keyDown(window, { key: "3" });
		fireEvent.keyDown(window, { key: "4" });

		// Assert
		expect(handleSelect).not.toHaveBeenCalled();
	});

	it("ignores keyboard number keys for out-of-range options and non-digit keys", () => {
		// Arrange
		const handleSelect = vi.fn();
		const state: ScenarioOverlayState = { status: "unanswered" };
		render(
			<ScenarioOverlay
				onResume={vi.fn()}
				onSelectOption={handleSelect}
				scenario={baseScenario}
				state={state}
			/>,
		);

		// Act
		fireEvent.keyDown(window, { key: "9" });
		fireEvent.keyDown(window, { key: "Escape" });
		fireEvent.keyDown(window, { key: "a" });

		// Assert
		expect(handleSelect).not.toHaveBeenCalled();
	});

	it("ignores keyboard hotkeys when state is answered or timedOut", () => {
		// Arrange
		const handleSelect = vi.fn();
		const answeredState: ScenarioOverlayState = {
			correctOptionId: "opt_1",
			isCorrect: true,
			selectedOptionId: "opt_1",
			status: "answered",
		};
		render(
			<ScenarioOverlay
				onResume={vi.fn()}
				onSelectOption={handleSelect}
				scenario={baseScenario}
				state={answeredState}
			/>,
		);

		// Act
		fireEvent.keyDown(window, { key: "1" });

		// Assert
		expect(handleSelect).not.toHaveBeenCalled();
	});

	it("renders circular countdown timer gauge for timed modules when totalMs and remainingMs are provided", () => {
		// Arrange
		const state: ScenarioOverlayState = { status: "unanswered" };

		// Act
		render(
			<ScenarioOverlay
				onResume={vi.fn()}
				onSelectOption={vi.fn()}
				remainingMs={2500}
				scenario={baseScenario}
				state={state}
				totalMs={3000}
			/>,
		);
		const gauge = screen.getByTestId("scenario-timer-gauge");
		const text = screen.getByText("2.5s");

		// Assert
		expect(gauge).toBeDefined();
		expect(text).toBeDefined();
	});

	it("applies critical red pulse styling when remainingMs <= 1000ms", () => {
		// Arrange
		const state: ScenarioOverlayState = { status: "unanswered" };

		// Act
		render(
			<ScenarioOverlay
				onResume={vi.fn()}
				onSelectOption={vi.fn()}
				remainingMs={800}
				scenario={baseScenario}
				state={state}
				totalMs={3000}
			/>,
		);
		const timerGauge = screen.getByTestId("scenario-timer-gauge");

		// Assert
		expect(timerGauge.className).toContain("animate-pulse");
		expect(timerGauge.className).toContain("text-rose-400");
	});

	it("omits the countdown timer for STRATEGY module even if totalMs is provided", () => {
		// Arrange
		const strategyScenario: ScenarioData = {
			...baseScenario,
			moduleType: "STRATEGY",
		};
		const state: ScenarioOverlayState = { status: "unanswered" };

		// Act
		render(
			<ScenarioOverlay
				onResume={vi.fn()}
				onSelectOption={vi.fn()}
				remainingMs={3000}
				scenario={strategyScenario}
				state={state}
				totalMs={3000}
			/>,
		);
		const timerGauge = screen.queryByTestId("scenario-timer-gauge");

		// Assert
		expect(timerGauge).toBeNull();
	});

	it("omits the countdown timer when totalMs is undefined or 0", () => {
		// Arrange
		const state: ScenarioOverlayState = { status: "unanswered" };

		// Act
		render(
			<ScenarioOverlay
				onResume={vi.fn()}
				onSelectOption={vi.fn()}
				scenario={baseScenario}
				state={state}
			/>,
		);
		const timerGauge = screen.queryByTestId("scenario-timer-gauge");

		// Assert
		expect(timerGauge).toBeNull();
	});

	it("renders PASS feedback banner and enables resuming playback when answered correctly", () => {
		// Arrange
		const handleResume = vi.fn();
		const answeredCorrectState: ScenarioOverlayState = {
			correctOptionId: "opt_1",
			isCorrect: true,
			selectedOptionId: "opt_1",
			status: "answered",
		};
		render(
			<ScenarioOverlay
				onResume={handleResume}
				onSelectOption={vi.fn()}
				scenario={baseScenario}
				state={answeredCorrectState}
			/>,
		);

		// Act
		const passBadge = screen.getByText("PASS");
		const explanation = screen.getByText(
			"Ana used Sleep Dart aggressively 4s ago, leaving her vulnerable to dive.",
		);
		const resumeBtn = screen.getByRole("button", { name: /resume playback/i });
		fireEvent.click(resumeBtn);

		// Assert
		expect(passBadge).toBeDefined();
		expect(explanation).toBeDefined();
		expect(handleResume).toHaveBeenCalled();
	});

	it("renders FAIL feedback banner highlighting selected wrong option and correct option", () => {
		// Arrange
		const answeredWrongState: ScenarioOverlayState = {
			correctOptionId: "opt_1",
			isCorrect: false,
			selectedOptionId: "opt_2",
			status: "answered",
		};

		// Act
		render(
			<ScenarioOverlay
				onResume={vi.fn()}
				onSelectOption={vi.fn()}
				scenario={baseScenario}
				state={answeredWrongState}
			/>,
		);
		const failBadge = screen.getByText("FAIL");
		const wrongOption = screen.getByTestId("scenario-option-opt_2");
		const correctOption = screen.getByTestId("scenario-option-opt_1");

		// Assert
		expect(failBadge).toBeDefined();
		expect(wrongOption.className).toContain("border-rose-500");
		expect(correctOption.className).toContain("border-emerald-500");
	});

	it("renders TIME EXPIRED feedback banner and reveals correct option when timedOut", () => {
		// Arrange
		const timedOutState: ScenarioOverlayState = {
			correctOptionId: "opt_1",
			isCorrect: false,
			status: "timedOut",
		};

		// Act
		render(
			<ScenarioOverlay
				onResume={vi.fn()}
				onSelectOption={vi.fn()}
				scenario={baseScenario}
				state={timedOutState}
			/>,
		);
		const timeoutBadge = screen.getByText("TIME EXPIRED");
		const correctOption = screen.getByTestId("scenario-option-opt_1");
		const otherOption = screen.getByTestId("scenario-option-opt_2");

		// Assert
		expect(timeoutBadge).toBeDefined();
		expect(correctOption.className).toContain("border-emerald-500");
		expect(otherOption.className).toContain("opacity-50");
	});

	it("announces outcome status via an aria-live region for screen readers", () => {
		// Arrange
		const answeredCorrectState: ScenarioOverlayState = {
			correctOptionId: "opt_1",
			isCorrect: true,
			selectedOptionId: "opt_1",
			status: "answered",
		};

		// Act
		render(
			<ScenarioOverlay
				onResume={vi.fn()}
				onSelectOption={vi.fn()}
				scenario={baseScenario}
				state={answeredCorrectState}
			/>,
		);
		const liveRegion = screen.getByRole("status");

		// Assert
		expect(liveRegion.textContent).toContain("PASS");
	});

	it("renders replay context button when unanswered and calls onReplayContext on click", () => {
		// Arrange
		const handleReplayContext = vi.fn();
		const state: ScenarioOverlayState = { status: "unanswered" };

		// Act
		render(
			<ScenarioOverlay
				onReplayContext={handleReplayContext}
				onResume={vi.fn()}
				onSelectOption={vi.fn()}
				scenario={baseScenario}
				state={state}
			/>,
		);
		const replayBtn = screen.getByTestId("replay-context-button");
		fireEvent.click(replayBtn);

		// Assert
		expect(replayBtn).toBeDefined();
		expect(handleReplayContext).toHaveBeenCalledTimes(1);
	});
});
