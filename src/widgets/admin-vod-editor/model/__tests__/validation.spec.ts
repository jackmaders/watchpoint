import { describe, expect, it } from "vitest";
import {
	boundedSliderConfigSchema,
	mapPinConfigSchema,
	multipleChoiceConfigSchema,
	percentSliderConfigSchema,
	timeSliderConfigSchema,
	validateInputConfigByType,
	validateScenarioConfig,
	validateVodForPublishing,
} from "../validation";

describe("admin-vod-editor validation rules", () => {
	describe("multipleChoiceConfigSchema", () => {
		it("validates valid options", () => {
			const valid = {
				options: [
					{ id: "1", is_correct: true, text: "Correct" },
					{ id: "2", is_correct: false, text: "Wrong" },
				],
			};
			expect(multipleChoiceConfigSchema.safeParse(valid).success).toBe(true);
		});

		it("rejects fewer than 2 options", () => {
			const invalid = {
				options: [{ id: "1", is_correct: true, text: "Only one" }],
			};
			expect(multipleChoiceConfigSchema.safeParse(invalid).success).toBe(false);
		});

		it("rejects when no option is marked correct", () => {
			const invalid = {
				options: [
					{ id: "1", is_correct: false, text: "A" },
					{ id: "2", is_correct: false, text: "B" },
				],
			};
			expect(multipleChoiceConfigSchema.safeParse(invalid).success).toBe(false);
		});
	});

	describe("slider & map pin schemas", () => {
		it("validates percent slider", () => {
			expect(percentSliderConfigSchema.safeParse({ target: 50 }).success).toBe(
				true,
			);
			expect(percentSliderConfigSchema.safeParse({ target: 150 }).success).toBe(
				false,
			);
		});

		it("validates time slider", () => {
			expect(timeSliderConfigSchema.safeParse({ target: 5 }).success).toBe(
				true,
			);
			expect(timeSliderConfigSchema.safeParse({ target: 15 }).success).toBe(
				false,
			);
		});

		it("validates custom bounded slider", () => {
			const custom = boundedSliderConfigSchema("Custom", { max: 20, min: 10 });
			expect(custom.safeParse({ target: 15 }).success).toBe(true);
			expect(custom.safeParse({ target: 5 }).success).toBe(false);
		});

		it("validates map pin config", () => {
			expect(mapPinConfigSchema.safeParse({ x: 10, y: 20 }).success).toBe(true);
			expect(
				mapPinConfigSchema.safeParse({ targetX: 10, targetY: 20 }).success,
			).toBe(true);
			expect(mapPinConfigSchema.safeParse({}).success).toBe(false);
		});
	});

	describe("validateInputConfigByType", () => {
		it("rejects non-object config", () => {
			const result = validateInputConfigByType(
				"MULTIPLE_CHOICE",
				null as unknown,
			);
			expect(result.valid).toBe(false);
			expect(result.error).toBe("Scenario input config is required");
		});

		it("validates valid input configs", () => {
			expect(
				validateInputConfigByType("MULTIPLE_CHOICE", {
					options: [
						{ id: "1", is_correct: true, text: "A" },
						{ id: "2", is_correct: false, text: "B" },
					],
				}).valid,
			).toBe(true);
			expect(
				validateInputConfigByType("PERCENT_SLIDER", { target: 50 }).valid,
			).toBe(true);
			expect(
				validateInputConfigByType("TIME_SLIDER", { target: 5 }).valid,
			).toBe(true);
			expect(
				validateInputConfigByType("MAP_PIN_2D", { targetX: 1, targetY: 2 })
					.valid,
			).toBe(true);
		});

		it("rejects invalid input configs", () => {
			expect(
				validateInputConfigByType("MULTIPLE_CHOICE", {
					options: [{ id: "1", is_correct: true, text: "A" }],
				}).valid,
			).toBe(false);
			expect(
				validateInputConfigByType("PERCENT_SLIDER", { target: 150 }).valid,
			).toBe(false);
			expect(
				validateInputConfigByType("TIME_SLIDER", { target: 150 }).valid,
			).toBe(false);
			expect(validateInputConfigByType("MAP_PIN_2D", {}).valid).toBe(false);
		});
	});

	describe("validateScenarioConfig", () => {
		it("requires promptText", () => {
			expect(
				validateScenarioConfig({
					explanationText: "exp",
					inputType: "PERCENT_SLIDER",
					promptText: "",
					timestampSeconds: 10,
				}).valid,
			).toBe(false);
		});

		it("requires explanationText", () => {
			expect(
				validateScenarioConfig({
					explanationText: "",
					inputType: "PERCENT_SLIDER",
					promptText: "prompt",
					timestampSeconds: 10,
				}).valid,
			).toBe(false);
		});

		it("validates timestampSeconds", () => {
			expect(
				validateScenarioConfig({
					explanationText: "exp",
					inputType: "PERCENT_SLIDER",
					promptText: "prompt",
					timestampSeconds: -1,
				}).valid,
			).toBe(false);
		});

		it("validates timeLimitSeconds", () => {
			expect(
				validateScenarioConfig({
					explanationText: "exp",
					inputType: "PERCENT_SLIDER",
					promptText: "prompt",
					timeLimitSeconds: -5,
					timestampSeconds: 10,
				}).valid,
			).toBe(false);
		});

		it("requires inputType", () => {
			expect(
				validateScenarioConfig({
					explanationText: "exp",
					inputType: null,
					promptText: "prompt",
					timestampSeconds: 10,
				}).valid,
			).toBe(false);
		});

		it("passes for valid scenario", () => {
			expect(
				validateScenarioConfig({
					explanationText: "exp",
					inputConfig: { target: 50 },
					inputType: "PERCENT_SLIDER",
					promptText: "prompt",
					timeLimitSeconds: 10,
					timestampSeconds: 5,
				}).valid,
			).toBe(true);
		});
	});

	describe("validateVodForPublishing", () => {
		const mockVod = { durationSeconds: 600 };
		const mockScenarios = [
			{
				createdAt: new Date(),
				explanationText: "exp",
				id: "sc-1",
				imageUrl: null,
				inputConfig: { target: 50 },
				inputType: "PERCENT_SLIDER" as const,
				moduleType: "STRATEGY" as const,
				position: 0,
				promptText: "prompt",
				timeLimitSeconds: 10,
				timestampSeconds: 60,
				updatedAt: new Date(),
				vodId: "vod-1",
			},
		];

		it("validates vod with scenarios", () => {
			expect(validateVodForPublishing(mockVod, mockScenarios).valid).toBe(true);
		});

		it("rejects vod with zero scenarios", () => {
			const result = validateVodForPublishing(mockVod, []);
			expect(result.valid).toBe(false);
			expect(result.error).toBe("Cannot publish a VOD with zero scenarios");
		});

		it("rejects invalid scenario in list", () => {
			const [first] = mockScenarios;
			const invalid = [{ ...(first ?? mockScenarios[0]), promptText: "" }];
			const result = validateVodForPublishing(mockVod, invalid);
			expect(result.valid).toBe(false);
		});

		it("rejects scenario timestamp exceeding duration", () => {
			const [first] = mockScenarios;
			const exceeding = [
				{ ...(first ?? mockScenarios[0]), timestampSeconds: 700 },
			];
			const result = validateVodForPublishing(mockVod, exceeding);
			expect(result.valid).toBe(false);
			expect(result.error).toContain("exceeds VOD duration");
		});
	});
});
