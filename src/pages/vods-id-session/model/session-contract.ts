/**
 * Data contracts and normalization utilities for interactive scenario inputs and overlay states.
 *
 * Implements `normalizeScenario`, `normalizeScenarioInput`, and `toScenarioOverlayData` to transform
 * raw database scenario records into strongly-typed multiple-choice or unsupported option structures.
 */
import { type InputType, inputTypeEnum, type ModuleType } from "@/shared/db";

export interface ScenarioOption {
	id: string;
	is_correct?: boolean;
	label?: string;
	text: string;
}

export type ScenarioInputType = InputType | "UNSUPPORTED";

export interface ScenarioAnswerSemantics {
	correctOptionId: string;
	evaluateAnswer: (optionId: string) => boolean;
}

export type ScenarioInput =
	| (ScenarioAnswerSemantics & {
			inputType: InputType;
			kind: "multiple-choice";
			options: ScenarioOption[];
	  })
	| (ScenarioAnswerSemantics & {
			inputType: ScenarioInputType;
			kind: "unsupported";
			options: [];
			reason: "malformed-input-config" | "unsupported-input-type";
	  });

export interface ScenarioData {
	explanationText: string;
	id: string;
	imageUrl?: string | null;
	input: ScenarioInput;
	inputType: ScenarioInputType;
	moduleType: ModuleType;
	promptText: string;
	timeLimitSeconds?: number | null;
}

export type ScenarioOverlayState =
	| { status: "unanswered" }
	| {
			correctOptionId: string;
			isCorrect: boolean;
			selectedOptionId: string;
			status: "answered";
	  }
	| {
			correctOptionId: string;
			isCorrect: false;
			status: "timedOut";
	  };

export interface ScenarioContractSource {
	explanationText: string;
	id: string;
	imageUrl?: string | null;
	inputConfig: unknown;
	inputType: unknown;
	moduleType: ModuleType;
	promptText: string;
	timeLimitSeconds?: number | null;
}

export type NormalizedScenario<
	T extends ScenarioContractSource = ScenarioContractSource,
> = Omit<T, "inputConfig" | "inputType"> & {
	input: ScenarioInput;
	inputType: ScenarioInputType;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function normalizeScenarioOption(value: unknown): ScenarioOption | null {
	if (
		!isRecord(value) ||
		typeof value.id !== "string" ||
		typeof value.text !== "string"
	) {
		return null;
	}

	const option: ScenarioOption = {
		id: value.id,
		text: value.text,
	};

	if (typeof value.is_correct === "boolean") {
		option.is_correct = value.is_correct;
	}
	if (typeof value.label === "string") {
		option.label = value.label;
	}

	return option;
}

function normalizeScenarioOptions(inputConfig: unknown): ScenarioOption[] {
	if (!isRecord(inputConfig) || !Array.isArray(inputConfig.options)) {
		return [];
	}

	return inputConfig.options
		.map(normalizeScenarioOption)
		.filter((option): option is ScenarioOption => option !== null);
}

function getCorrectOptionId(options: ScenarioOption[]): string {
	return options.reduce(
		(correctOptionId, option) =>
			correctOptionId || (option.is_correct ? option.id : ""),
		"",
	);
}

function createUnsupportedInput(
	inputType: ScenarioInputType,
	reason: "malformed-input-config" | "unsupported-input-type",
): ScenarioInput {
	return {
		correctOptionId: "",
		evaluateAnswer: () => false,
		inputType,
		kind: "unsupported",
		options: [],
		reason,
	};
}

function normalizeMultipleChoiceInput(inputConfig: unknown): ScenarioInput {
	const options = normalizeScenarioOptions(inputConfig);
	if (options.length === 0 || !options.some((option) => option.is_correct)) {
		return createUnsupportedInput("MULTIPLE_CHOICE", "malformed-input-config");
	}

	const correctOptionId = getCorrectOptionId(options);
	return {
		correctOptionId,
		evaluateAnswer: (optionId) =>
			options.some(
				(option) => option.id === optionId && option.is_correct === true,
			),
		inputType: "MULTIPLE_CHOICE",
		kind: "multiple-choice",
		options,
	};
}

type ScenarioInputNormalizer = (inputConfig: unknown) => ScenarioInput;

const SCENARIO_INPUT_REGISTRY: Partial<
	Record<InputType, ScenarioInputNormalizer>
> = {
	MULTIPLE_CHOICE: normalizeMultipleChoiceInput,
};

function isInputType(value: unknown): value is InputType {
	return (
		typeof value === "string" && inputTypeEnum.includes(value as InputType)
	);
}

export function normalizeScenarioInput(
	inputType: unknown,
	inputConfig: unknown,
): ScenarioInput {
	if (!isInputType(inputType)) {
		return createUnsupportedInput("UNSUPPORTED", "unsupported-input-type");
	}

	const normalizer = SCENARIO_INPUT_REGISTRY[inputType];
	return normalizer
		? normalizer(inputConfig)
		: createUnsupportedInput(inputType, "unsupported-input-type");
}

export function normalizeScenario<T extends ScenarioContractSource>(
	scenario: T,
): NormalizedScenario<T> {
	const input = normalizeScenarioInput(
		scenario.inputType,
		scenario.inputConfig,
	);
	const {
		inputConfig: _inputConfig,
		inputType: _inputType,
		...metadata
	} = scenario;

	return {
		...metadata,
		input,
		inputType: input.inputType,
	} as NormalizedScenario<T>;
}

export function toScenarioOverlayData(
	scenario: NormalizedScenario | ScenarioContractSource | null,
): ScenarioData | null {
	if (!scenario) return null;

	const normalized =
		"input" in scenario ? scenario : normalizeScenario(scenario);

	return {
		explanationText: normalized.explanationText,
		id: normalized.id,
		imageUrl: normalized.imageUrl,
		input: normalized.input,
		inputType: normalized.inputType,
		moduleType: normalized.moduleType,
		promptText: normalized.promptText,
		timeLimitSeconds: normalized.timeLimitSeconds,
	};
}
