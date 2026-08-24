import { describe, expect, it } from "vitest";
import {
	normalizeScenario,
	normalizeScenarioInput,
	toScenarioOverlayData,
} from "../session-contract";

describe("Scenario Input contract", () => {
	it("normalizes multiple-choice options and exposes answer semantics", () => {
		// Arrange
		const inputConfig = {
			options: [
				{ id: "opt_1", is_correct: false, label: "A", text: "Rotate" },
				{ id: "opt_2", is_correct: true, text: "Dive" },
			],
		};

		// Act
		const input = normalizeScenarioInput("MULTIPLE_CHOICE", inputConfig);

		// Assert
		expect(input).toMatchObject({
			correctOptionId: "opt_2",
			inputType: "MULTIPLE_CHOICE",
			kind: "multiple-choice",
			options: inputConfig.options,
		});
		expect(input.evaluateAnswer("opt_2")).toBe(true);
		expect(input.evaluateAnswer("opt_1")).toBe(false);
	});

	it("filters malformed multiple-choice options at the input seam", () => {
		// Arrange
		const inputConfig = {
			options: [
				null,
				{ id: "missing-text" },
				{ id: "opt_1", is_correct: true, text: "Rotate" },
			],
		};

		// Act
		const input = normalizeScenarioInput("MULTIPLE_CHOICE", inputConfig);

		// Assert
		expect(input).toMatchObject({
			kind: "multiple-choice",
			options: [{ id: "opt_1", text: "Rotate" }],
		});
	});

	it("rejects a multiple-choice payload without a correct answer", () => {
		// Arrange
		const inputConfig = {
			options: [{ id: "opt_1", text: "Rotate" }],
		};

		// Act
		const input = normalizeScenarioInput("MULTIPLE_CHOICE", inputConfig);

		// Assert
		expect(input).toMatchObject({
			inputType: "MULTIPLE_CHOICE",
			kind: "unsupported",
			options: [],
			reason: "malformed-input-config",
		});
	});

	it("carries the normalized input type through the manifest-to-overlay contract", () => {
		// Arrange
		const scenario = {
			explanationText: "Estimate the enemy ultimate charge.",
			id: "sc_ultimate",
			inputConfig: { max: 100, min: 0 },
			inputType: "PERCENT_SLIDER" as const,
			moduleType: "ULTIMATE" as const,
			promptText: "How close is the enemy ultimate?",
			timeLimitSeconds: null,
		};

		// Act
		const overlayData = toScenarioOverlayData(scenario);

		// Assert
		expect(overlayData).toMatchObject({
			input: {
				inputType: "PERCENT_SLIDER",
				kind: "unsupported",
				options: [],
				reason: "unsupported-input-type",
			},
			inputType: "PERCENT_SLIDER",
		});
	});

	it("resolves malformed multiple-choice payloads to an overlay-safe result", () => {
		// Arrange
		const scenario = {
			explanationText: "Choose the next play.",
			id: "sc_malformed",
			inputConfig: { options: "not-an-array" },
			inputType: "MULTIPLE_CHOICE" as const,
			moduleType: "TACTICS" as const,
			promptText: "What is the next play?",
			timeLimitSeconds: 3,
		};

		// Act
		const normalizedScenario = normalizeScenario(scenario);

		// Assert
		expect(normalizedScenario.input).toMatchObject({
			correctOptionId: "",
			inputType: "MULTIPLE_CHOICE",
			kind: "unsupported",
			options: [],
			reason: "malformed-input-config",
		});
		expect(normalizedScenario.input.evaluateAnswer("opt_1")).toBe(false);
	});

	it("resolves an unknown input discriminator to the stable unsupported result", () => {
		// Arrange
		const inputType = "FUTURE_INPUT";

		// Act
		const input = normalizeScenarioInput(inputType, { arbitrary: "payload" });

		// Assert
		expect(input).toMatchObject({
			inputType: "UNSUPPORTED",
			kind: "unsupported",
			reason: "unsupported-input-type",
		});
	});
});
