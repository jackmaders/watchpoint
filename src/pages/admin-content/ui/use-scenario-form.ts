"use client";

import { useCallback, useEffect, useState } from "react";
import type { InputType, ModuleType, scenarios } from "@/shared/db";
import {
	type ScenarioEditorFormProps,
	validateScenarioForm,
} from "./scenario-editor-form";

export function useScenarioFormInit(
	scenario: typeof scenarios.$inferSelect | null | undefined,
) {
	const [promptText, setPromptText] = useState(scenario?.promptText ?? "");
	const [explanationText, setExplanationText] = useState(
		scenario?.explanationText ?? "",
	);
	const [timestampSeconds, setTimestampSeconds] = useState<number | string>(
		scenario?.timestampSeconds ?? 0,
	);
	const [timeLimitSeconds, setTimeLimitSeconds] = useState<number | string>(
		scenario?.timeLimitSeconds ?? "",
	);
	const [moduleType, setModuleType] = useState<ModuleType>(
		scenario?.moduleType ?? "STRATEGY",
	);
	const [inputType, setInputType] = useState<InputType>(
		scenario?.inputType ?? "MULTIPLE_CHOICE",
	);
	const [imageUrl, setImageUrl] = useState(scenario?.imageUrl ?? "");
	const [inputConfig, setInputConfig] = useState<Record<string, unknown>>(
		scenario?.inputConfig ?? {},
	);

	useEffect(() => {
		if (scenario) {
			setPromptText(scenario.promptText);
			setExplanationText(scenario.explanationText);
			setTimestampSeconds(scenario.timestampSeconds);
			setTimeLimitSeconds(scenario.timeLimitSeconds ?? "");
			setModuleType(scenario.moduleType);
			setInputType(scenario.inputType);
			setImageUrl(scenario.imageUrl ?? "");
			setInputConfig(scenario.inputConfig ?? {});
		} else {
			setPromptText("");
			setExplanationText("");
			setTimestampSeconds(0);
			setTimeLimitSeconds("");
			setModuleType("STRATEGY");
			setInputType("MULTIPLE_CHOICE");
			setImageUrl("");
			setInputConfig({});
		}
	}, [scenario]);

	return {
		explanationText,
		imageUrl,
		inputConfig,
		inputType,
		moduleType,
		promptText,
		setExplanationText,
		setImageUrl,
		setInputConfig,
		setInputType,
		setModuleType,
		setPromptText,
		setTimeLimitSeconds,
		setTimestampSeconds,
		timeLimitSeconds,
		timestampSeconds,
	};
}

export function useScenarioFormHandlers(
	state: ReturnType<typeof useScenarioFormInit>,
	vod: ScenarioEditorFormProps["vod"],
	scenario: ScenarioEditorFormProps["scenario"],
	onSave: ScenarioEditorFormProps["onSave"],
) {
	const [error, setError] = useState<string | null>(null);

	const handlePromptChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) =>
			state.setPromptText(e.target.value),
		[state],
	);
	const handleExplanationChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) =>
			state.setExplanationText(e.target.value),
		[state],
	);
	const handleTimestampChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) =>
			state.setTimestampSeconds(e.target.value),
		[state],
	);
	const handleTimeLimitChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) =>
			state.setTimeLimitSeconds(e.target.value),
		[state],
	);
	const handleModuleTypeChange = useCallback(
		(e: React.ChangeEvent<HTMLSelectElement>) =>
			state.setModuleType(e.target.value as ModuleType),
		[state],
	);
	const handleInputTypeChange = useCallback(
		(e: React.ChangeEvent<HTMLSelectElement>) => {
			state.setInputType(e.target.value as InputType);
			state.setInputConfig({});
		},
		[state],
	);
	const handleImageUrlChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) =>
			state.setImageUrl(e.target.value),
		[state],
	);

	const handleSubmit = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault();
			const validationErr = validateScenarioForm(
				state.promptText,
				state.explanationText,
				state.timestampSeconds,
				vod.durationSeconds,
			);
			if (validationErr) {
				setError(validationErr);
				return;
			}
			setError(null);
			onSave({
				explanationText: state.explanationText.trim(),
				id: scenario?.id,
				imageUrl: state.imageUrl.trim() || null,
				inputConfig: state.inputConfig,
				inputType: state.inputType,
				moduleType: state.moduleType,
				promptText: state.promptText.trim(),
				timeLimitSeconds:
					state.timeLimitSeconds === "" ? null : Number(state.timeLimitSeconds),
				timestampSeconds: Number(state.timestampSeconds),
				vodId: vod.id,
			});
		},
		[onSave, scenario?.id, state, vod.durationSeconds, vod.id],
	);

	return {
		error,
		handleExplanationChange,
		handleImageUrlChange,
		handleInputTypeChange,
		handleModuleTypeChange,
		handlePromptChange,
		handleSubmit,
		handleTimeLimitChange,
		handleTimestampChange,
	};
}
