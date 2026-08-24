import { describe, expect, it } from "vitest";
import {
	mapPinConfigSchema,
	multipleChoiceConfigSchema,
	percentSliderConfigSchema,
	timeSliderConfigSchema,
	validateInputConfigByType,
	validateScenarioConfig,
	validateVodForPublishing,
} from "../validation";

describe("vods validation", () => {
	it("validates multiple choice config with valid options", () => {
		// Arrange
		const validConfig = {
			options: [
				{ id: "1", is_correct: true, text: "Correct Answer" },
				{ id: "2", is_correct: false, text: "Wrong Answer" },
			],
		};

		// Act
		const result = multipleChoiceConfigSchema.safeParse(validConfig);

		// Assert
		expect(result.success).toBe(true);
	});

	it("rejects multiple choice config without correct option", () => {
		// Arrange
		const invalidConfig = {
			options: [
				{ id: "1", is_correct: false, text: "Wrong 1" },
				{ id: "2", is_correct: false, text: "Wrong 2" },
			],
		};

		// Act
		const result = multipleChoiceConfigSchema.safeParse(invalidConfig);

		// Assert
		expect(result.success).toBe(false);
	});

	it("validates percent slider target in range", () => {
		// Arrange
		const validSlider = { max: 100, min: 0, target: 75 };

		// Act
		const result = percentSliderConfigSchema.safeParse(validSlider);

		// Assert
		expect(result.success).toBe(true);
	});

	it("rejects percent slider target outside range", () => {
		// Arrange
		const invalidSlider = { max: 100, min: 0, target: 150 };

		// Act
		const result = percentSliderConfigSchema.safeParse(invalidSlider);

		// Assert
		expect(result.success).toBe(false);
	});

	it("validates time slider config in range", () => {
		// Arrange
		const validTimeSlider = { max: 10, min: 0, target: 5 };

		// Act
		const result = timeSliderConfigSchema.safeParse(validTimeSlider);

		// Assert
		expect(result.success).toBe(true);
	});

	it("validates map pin coordinate targets", () => {
		// Arrange
		const validMapPin = { targetX: 120, targetY: 450 };

		// Act
		const result = mapPinConfigSchema.safeParse(validMapPin);

		// Assert
		expect(result.success).toBe(true);
	});

	it("validates input config through validateInputConfigByType", () => {
		// Arrange
		const config = {
			options: [
				{ id: "1", is_correct: true, text: "Opt 1" },
				{ id: "2", is_correct: false, text: "Opt 2" },
			],
		};

		// Act
		const result = validateInputConfigByType("MULTIPLE_CHOICE", config);

		// Assert
		expect(result.valid).toBe(true);
	});

	it("validates full scenario configuration through validateScenarioConfig", () => {
		// Arrange
		const validScenario = {
			explanationText: "Valid explanation",
			inputConfig: {
				options: [
					{ id: "1", is_correct: true, text: "Opt 1" },
					{ id: "2", is_correct: false, text: "Opt 2" },
				],
			},
			inputType: "MULTIPLE_CHOICE" as const,
			promptText: "Valid prompt",
			timeLimitSeconds: 5,
			timestampSeconds: 12.5,
		};

		// Act
		const result = validateScenarioConfig(validScenario);

		// Assert
		expect(result.valid).toBe(true);
	});

	it("rejects invalid scenario basic fields", () => {
		// Arrange & Act
		const emptyPrompt = validateScenarioConfig({ promptText: "" });
		const emptyExpl = validateScenarioConfig({
			explanationText: "",
			promptText: "P",
		});
		const negativeTimestamp = validateScenarioConfig({
			explanationText: "E",
			promptText: "P",
			timestampSeconds: -1,
		});

		// Assert
		expect(emptyPrompt.valid).toBe(false);
		expect(emptyExpl.valid).toBe(false);
		expect(negativeTimestamp.valid).toBe(false);
	});

	it("validates VOD publishing conditions", () => {
		// Arrange
		const vod = { durationSeconds: 600 };
		const validScenarios = [
			{
				explanationText: "E",
				id: "1",
				imageUrl: null,
				inputConfig: {
					options: [
						{ id: "1", is_correct: true, text: "Opt 1" },
						{ id: "2", is_correct: false, text: "Opt 2" },
					],
				},
				inputType: "MULTIPLE_CHOICE" as const,
				moduleType: "STRATEGY" as const,
				promptText: "P",
				timeLimitSeconds: null,
				timestampSeconds: 50,
				vodId: "vod_1",
			},
		];

		// Act
		const result = validateVodForPublishing(vod, validScenarios);

		// Assert
		expect(result.valid).toBe(true);
	});

	it("rejects publishing VOD with 0 scenarios or out-of-bounds scenario timestamp", () => {
		// Arrange
		const vod = { durationSeconds: 100 };
		const emptyScenarios: never[] = [];
		const outOfBounds = [
			{
				explanationText: "E",
				id: "1",
				imageUrl: null,
				inputConfig: {
					options: [
						{ id: "1", is_correct: true, text: "Opt 1" },
						{ id: "2", is_correct: false, text: "Opt 2" },
					],
				},
				inputType: "MULTIPLE_CHOICE" as const,
				moduleType: "STRATEGY" as const,
				promptText: "P",
				timeLimitSeconds: null,
				timestampSeconds: 200,
				vodId: "vod_1",
			},
		];

		// Act
		const emptyResult = validateVodForPublishing(vod, emptyScenarios);
		const outOfBoundsResult = validateVodForPublishing(vod, outOfBounds);

		// Assert
		expect(emptyResult.valid).toBe(false);
		expect(outOfBoundsResult.valid).toBe(false);
	});
});
