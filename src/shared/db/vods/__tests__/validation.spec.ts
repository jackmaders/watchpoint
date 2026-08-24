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
	describe("multipleChoiceConfigSchema", () => {
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

		it("rejects multiple choice with fewer than 2 options or empty option text", () => {
			// Act & Assert
			expect(
				multipleChoiceConfigSchema.safeParse({
					options: [{ id: "1", is_correct: true, text: "Single" }],
				}).success,
			).toBe(false);

			expect(
				multipleChoiceConfigSchema.safeParse({
					options: [
						{ id: "1", is_correct: true, text: "   " },
						{ id: "2", is_correct: false, text: "Option 2" },
					],
				}).success,
			).toBe(false);
		});
	});

	describe("boundedSliderConfigSchema (percent and time)", () => {
		it("validates percent slider target in range", () => {
			// Arrange
			const validSlider = { max: 100, min: 0, target: 75 };

			// Act
			const result = percentSliderConfigSchema.safeParse(validSlider);

			// Assert
			expect(result.success).toBe(true);
		});

		it("rejects percent slider target outside range or min >= max", () => {
			// Act & Assert
			expect(
				percentSliderConfigSchema.safeParse({ max: 100, min: 0, target: 150 })
					.success,
			).toBe(false);
			expect(
				percentSliderConfigSchema.safeParse({ max: 50, min: 60, target: 55 })
					.success,
			).toBe(false);
		});

		it("validates time slider config in range", () => {
			// Arrange
			const validTimeSlider = { max: 10, min: 0, target: 5 };

			// Act
			const result = timeSliderConfigSchema.safeParse(validTimeSlider);

			// Assert
			expect(result.success).toBe(true);
		});

		it("rejects time slider outside range", () => {
			// Act & Assert
			expect(
				timeSliderConfigSchema.safeParse({ max: 10, min: 0, target: 20 })
					.success,
			).toBe(false);
		});
	});

	describe("mapPinConfigSchema", () => {
		it("validates map pin coordinate targets (targetX/targetY and x/y)", () => {
			// Act & Assert
			expect(
				mapPinConfigSchema.safeParse({ targetX: 120, targetY: 450 }).success,
			).toBe(true);
			expect(mapPinConfigSchema.safeParse({ x: 120, y: 450 }).success).toBe(
				true,
			);
		});

		it("rejects invalid map pin coordinates", () => {
			// Act & Assert
			expect(mapPinConfigSchema.safeParse({}).success).toBe(false);
		});
	});

	describe("validateInputConfigByType", () => {
		it("validates input config through validateInputConfigByType for all types", () => {
			// Act & Assert
			expect(
				validateInputConfigByType("MULTIPLE_CHOICE", {
					options: [
						{ id: "1", is_correct: true, text: "Opt 1" },
						{ id: "2", is_correct: false, text: "Opt 2" },
					],
				}).valid,
			).toBe(true);

			expect(
				validateInputConfigByType("PERCENT_SLIDER", {
					max: 100,
					min: 0,
					target: 50,
				}).valid,
			).toBe(true);

			expect(
				validateInputConfigByType("TIME_SLIDER", {
					max: 10,
					min: 0,
					target: 5,
				}).valid,
			).toBe(true);

			expect(
				validateInputConfigByType("MAP_PIN_2D", {
					targetX: 10,
					targetY: 20,
				}).valid,
			).toBe(true);
		});

		it("rejects null or non-object configs", () => {
			// Act & Assert
			expect(validateInputConfigByType("MULTIPLE_CHOICE", null).valid).toBe(
				false,
			);
			expect(
				validateInputConfigByType("MULTIPLE_CHOICE", "invalid").valid,
			).toBe(false);
		});

		it("returns error message on schema validation failure", () => {
			// Act
			const result = validateInputConfigByType("MULTIPLE_CHOICE", {
				options: [],
			});

			// Assert
			expect(result.valid).toBe(false);
			expect(result.error).toBeDefined();
		});
	});

	describe("validateScenarioConfig", () => {
		const validScenario = {
			explanationText: "Explanation",
			inputConfig: {
				options: [
					{ id: "1", is_correct: true, text: "A" },
					{ id: "2", is_correct: false, text: "B" },
				],
			},
			inputType: "MULTIPLE_CHOICE" as const,
			promptText: "Prompt",
			timeLimitSeconds: 15,
			timestampSeconds: 30,
		};

		it("validates complete valid scenario config", () => {
			// Act
			const result = validateScenarioConfig(validScenario);

			// Assert
			expect(result.valid).toBe(true);
		});

		it("rejects empty or whitespace prompt text", () => {
			// Act & Assert
			expect(
				validateScenarioConfig({ ...validScenario, promptText: "" }).valid,
			).toBe(false);
			expect(
				validateScenarioConfig({ ...validScenario, promptText: "   " }).valid,
			).toBe(false);
		});

		it("rejects empty or whitespace explanation text", () => {
			// Act & Assert
			expect(
				validateScenarioConfig({ ...validScenario, explanationText: "" }).valid,
			).toBe(false);
			expect(
				validateScenarioConfig({ ...validScenario, explanationText: "   " })
					.valid,
			).toBe(false);
		});

		it("rejects invalid timestamp seconds (negative, non-number, non-finite)", () => {
			// Act & Assert
			expect(
				validateScenarioConfig({ ...validScenario, timestampSeconds: -1 })
					.valid,
			).toBe(false);
			expect(
				validateScenarioConfig({
					...validScenario,
					timestampSeconds: "30" as never,
				}).valid,
			).toBe(false);
			expect(
				validateScenarioConfig({
					...validScenario,
					timestampSeconds: Number.NaN,
				}).valid,
			).toBe(false);
		});

		it("rejects invalid time limit seconds (negative or zero)", () => {
			// Act & Assert
			expect(
				validateScenarioConfig({ ...validScenario, timeLimitSeconds: 0 }).valid,
			).toBe(false);
			expect(
				validateScenarioConfig({ ...validScenario, timeLimitSeconds: -5 })
					.valid,
			).toBe(false);
			expect(
				validateScenarioConfig({
					...validScenario,
					timeLimitSeconds: "10" as never,
				}).valid,
			).toBe(false);
		});

		it("rejects missing input type", () => {
			// Act & Assert
			expect(
				validateScenarioConfig({
					...validScenario,
					inputType: null as never,
				}).valid,
			).toBe(false);
		});
	});

	describe("validateVodForPublishing", () => {
		const mockVod = { durationSeconds: 600 };
		const mockScenarios = [
			{
				createdAt: new Date(),
				explanationText: "Exp",
				id: "s1",
				imageUrl: null,
				inputConfig: {
					options: [
						{ id: "1", is_correct: true, text: "A" },
						{ id: "2", is_correct: false, text: "B" },
					],
				},
				inputType: "MULTIPLE_CHOICE" as const,
				moduleType: "STRATEGY" as const,
				promptText: "Prompt",
				timeLimitSeconds: null,
				timestampSeconds: 50,
				updatedAt: new Date(),
				vodId: "v1",
			},
		];

		it("validates vod with scenarios within duration", () => {
			// Act
			const result = validateVodForPublishing(mockVod, mockScenarios);

			// Assert
			expect(result.valid).toBe(true);
		});

		it("rejects VOD with zero scenarios", () => {
			// Act
			const result = validateVodForPublishing(mockVod, []);

			// Assert
			expect(result.valid).toBe(false);
			expect(result.error).toBe("Cannot publish a VOD with zero scenarios");
		});

		it("rejects VOD with invalid scenario configuration", () => {
			// Arrange
			const baseScenario = mockScenarios[0];
			const invalidScenarios = baseScenario
				? [
						{
							...baseScenario,
							promptText: "",
						},
					]
				: [];

			// Act
			const result = validateVodForPublishing(mockVod, invalidScenarios);

			// Assert
			expect(result.valid).toBe(false);
			expect(result.error).toContain("Invalid scenario configuration");
		});

		it("rejects VOD when scenario timestamp exceeds VOD duration", () => {
			// Arrange
			const baseScenario = mockScenarios[0];
			const exceedingScenarios = baseScenario
				? [
						{
							...baseScenario,
							timestampSeconds: 700,
						},
					]
				: [];

			// Act
			const result = validateVodForPublishing(mockVod, exceedingScenarios);

			// Assert
			expect(result.valid).toBe(false);
			expect(result.error).toContain("exceeds VOD duration");
		});
	});
});
