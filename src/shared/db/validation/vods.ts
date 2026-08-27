import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import {
	heroRoleEnum,
	inputTypeEnum,
	moduleTypeEnum,
	scenarios,
	vods,
} from "../schema/vods";

export const multipleChoiceOptionSchema = z.object({
	id: z.string().min(1),
	is_correct: z.boolean(),
	text: z.string().min(1, "Option text cannot be empty"),
});

export const multipleChoiceConfigSchema = z
	.object({
		options: z
			.array(multipleChoiceOptionSchema)
			.min(2, "Multiple choice scenarios require at least 2 options"),
	})
	.refine(
		(data) =>
			data.options.some((opt) => opt.is_correct && opt.text.trim().length > 0),
		{
			message:
				"Multiple choice scenarios require at least one correct option with text",
		},
	);

export const boundedSliderConfigSchema = (
	typeName: string,
	defaultRange: { max: number; min: number },
) =>
	z
		.object({
			max: z.number().default(defaultRange.max),
			min: z.number().default(defaultRange.min),
			target: z.number(),
		})
		.refine(
			(data) =>
				data.min < data.max &&
				data.target >= data.min &&
				data.target <= data.max,
			{
				message: `${typeName} requires min < max and target within range`,
			},
		);

export const percentSliderConfigSchema = boundedSliderConfigSchema(
	"Percent slider",
	{
		max: 100,
		min: 0,
	},
);

export const timeSliderConfigSchema = boundedSliderConfigSchema("Time slider", {
	max: 10,
	min: 0,
});

export const mapPinConfigSchema = z
	.object({
		targetX: z.number().optional(),
		targetY: z.number().optional(),
		x: z.number().optional(),
		y: z.number().optional(),
	})
	.refine(
		(data) =>
			typeof (data.targetX ?? data.x) === "number" &&
			typeof (data.targetY ?? data.y) === "number",
		{
			message: "Map pin requires valid target coordinates",
		},
	);

export function validateInputConfigByType(
	inputType: (typeof inputTypeEnum)[number],
	config: unknown,
): { error?: string; valid: boolean } {
	if (!config || typeof config !== "object") {
		return { error: "Scenario input config is required", valid: false };
	}

	let result:
		| ReturnType<typeof multipleChoiceConfigSchema.safeParse>
		| ReturnType<typeof percentSliderConfigSchema.safeParse>
		| ReturnType<typeof timeSliderConfigSchema.safeParse>
		| ReturnType<typeof mapPinConfigSchema.safeParse>;
	switch (inputType) {
		case "MULTIPLE_CHOICE":
			result = multipleChoiceConfigSchema.safeParse(config);
			break;
		case "PERCENT_SLIDER":
			result = percentSliderConfigSchema.safeParse(config);
			break;
		case "TIME_SLIDER":
			result = timeSliderConfigSchema.safeParse(config);
			break;
		case "MAP_PIN_2D":
			result = mapPinConfigSchema.safeParse(config);
			break;
	}

	if (!result.success) {
		return {
			/* v8 ignore next */
			error: result.error.issues[0]?.message ?? "Invalid input configuration",
			valid: false,
		};
	}

	return { valid: true };
}

export const selectVodSchema = createSelectSchema(vods);
export const insertVodSchema = createInsertSchema(vods, {
	durationSeconds: (s) => s.positive("Duration must be a positive integer"),
	heroName: (s) => s.min(1, "Hero name is required"),
	mapName: (s) => s.min(1, "Map name is required"),
	rankTier: (s) => s.min(1, "Rank tier is required"),
	role: z.enum(heroRoleEnum),
	title: (s) => s.min(1, "Title is required"),
	youtubeVideoId: (s) => s.min(1, "YouTube Video ID is required"),
});

export const selectScenarioSchema = createSelectSchema(scenarios);
export const insertScenarioSchema = createInsertSchema(scenarios, {
	explanationText: (s) => s.min(1, "Scenario explanation text is required"),
	inputType: z.enum(inputTypeEnum),
	moduleType: z.enum(moduleTypeEnum),
	promptText: (s) => s.min(1, "Scenario prompt text is required"),
	timeLimitSeconds: (s) =>
		s
			.int("Time limit must be an integer")
			.positive("Scenario time limit must be a positive integer")
			.optional()
			.nullable(),
	timestampSeconds: (s) =>
		s
			.min(0, "Scenario timestamp must be a non-negative number")
			.refine(Number.isFinite, "Scenario timestamp must be a finite number"),
});

export function validateScenarioConfig(scenario: {
	explanationText?: string | null;
	inputConfig?: unknown;
	inputType?: (typeof inputTypeEnum)[number] | null;
	promptText?: string | null;
	timeLimitSeconds?: number | null;
	timestampSeconds?: number | null;
}): { error?: string; valid: boolean } {
	if (!scenario.promptText?.trim()) {
		return { error: "Scenario prompt text is required", valid: false };
	}
	if (!scenario.explanationText?.trim()) {
		return { error: "Scenario explanation text is required", valid: false };
	}
	if (
		typeof scenario.timestampSeconds !== "number" ||
		scenario.timestampSeconds < 0 ||
		!Number.isFinite(scenario.timestampSeconds)
	) {
		return {
			error: "Scenario timestamp must be a non-negative number",
			valid: false,
		};
	}
	if (
		scenario.timeLimitSeconds !== undefined &&
		scenario.timeLimitSeconds !== null &&
		(typeof scenario.timeLimitSeconds !== "number" ||
			scenario.timeLimitSeconds <= 0)
	) {
		return {
			error: "Scenario time limit must be a positive integer",
			valid: false,
		};
	}
	if (!scenario.inputType) {
		return { error: "Scenario input type is required", valid: false };
	}

	return validateInputConfigByType(scenario.inputType, scenario.inputConfig);
}

export function validateVodForPublishing(
	vod: { durationSeconds: number },
	scenariosList: ReadonlyArray<typeof scenarios.$inferSelect>,
): { error?: string; valid: boolean } {
	if (!scenariosList || scenariosList.length === 0) {
		return {
			error: "Cannot publish a VOD with zero scenarios",
			valid: false,
		};
	}

	for (const scenario of scenariosList) {
		const validation = validateScenarioConfig(scenario);
		if (!validation.valid) {
			return {
				error: `Invalid scenario configuration: ${validation.error}`,
				valid: false,
			};
		}
		if (scenario.timestampSeconds > vod.durationSeconds) {
			return {
				error: `Scenario timestamp (${scenario.timestampSeconds}s) exceeds VOD duration (${vod.durationSeconds}s)`,
				valid: false,
			};
		}
	}

	return { valid: true };
}
