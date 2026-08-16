import type { ModuleType } from "@/shared/db";

export interface ScenarioOption {
	id: string;
	is_correct?: boolean;
	label?: string;
	text: string;
}

export interface ScenarioInputConfig {
	options: ScenarioOption[];
}

export interface ScenarioData {
	explanationText: string;
	id: string;
	imageUrl?: string | null;
	inputConfig: ScenarioInputConfig;
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

interface ScenarioOverlaySource {
	explanationText: string;
	id: string;
	imageUrl?: string | null;
	inputConfig: unknown;
	moduleType: ModuleType;
	promptText: string;
	timeLimitSeconds?: number | null;
}

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

export function getScenarioOptions(inputConfig: unknown): ScenarioOption[] {
	if (!isRecord(inputConfig) || !Array.isArray(inputConfig.options)) {
		return [];
	}

	return inputConfig.options
		.map(normalizeScenarioOption)
		.filter((option): option is ScenarioOption => option !== null);
}

export function normalizeScenarioInputConfig(
	inputConfig: unknown,
): ScenarioInputConfig {
	return { options: getScenarioOptions(inputConfig) };
}

export function toScenarioOverlayData(
	scenario: ScenarioOverlaySource | null,
): ScenarioData | null {
	if (!scenario) return null;

	return {
		explanationText: scenario.explanationText,
		id: scenario.id,
		imageUrl: scenario.imageUrl,
		inputConfig: normalizeScenarioInputConfig(scenario.inputConfig),
		moduleType: scenario.moduleType,
		promptText: scenario.promptText,
		timeLimitSeconds: scenario.timeLimitSeconds,
	};
}
