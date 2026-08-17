"use client";

import { useCallback } from "react";
import type {
	ScenarioOption,
	ScenarioOverlayState,
} from "../model/session-contract";

export interface InteractiveOverlayEngineProps {
	onAnswer: (optionId: string) => void;
	options: ScenarioOption[];
	state: ScenarioOverlayState;
}

interface MultipleChoiceOptionButtonProps {
	isCorrectOption: boolean;
	isUnanswered: boolean;
	isWrongSelection: boolean;
	onAnswer: (optionId: string) => void;
	option: ScenarioOption;
	optionNumber: number;
}

function MultipleChoiceOptionButton({
	isCorrectOption,
	isUnanswered,
	isWrongSelection,
	onAnswer,
	option,
	optionNumber,
}: MultipleChoiceOptionButtonProps) {
	const handleClick = useCallback(() => {
		onAnswer(option.id);
	}, [onAnswer, option.id]);

	let buttonStyle =
		"border-slate-800 bg-slate-950/60 text-slate-200 hover:border-indigo-500 hover:bg-slate-800/80 cursor-pointer";

	if (!isUnanswered) {
		if (isCorrectOption) {
			buttonStyle =
				"border-emerald-500 bg-emerald-950/50 text-emerald-200 ring-1 ring-emerald-500/50";
		} else if (isWrongSelection) {
			buttonStyle =
				"border-rose-500 bg-rose-950/50 text-rose-200 ring-1 ring-rose-500/50";
		} else {
			buttonStyle =
				"border-slate-800/50 bg-slate-950/30 text-slate-500 opacity-50";
		}
	}

	return (
		<button
			aria-disabled={!isUnanswered}
			className={`w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all ${buttonStyle}`}
			data-testid={`scenario-option-${option.id}`}
			disabled={!isUnanswered}
			onClick={handleClick}
			type="button"
		>
			<div className="flex items-center gap-3">
				<span className="flex items-center justify-center w-6 h-6 rounded-md bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-slate-300">
					{optionNumber}
				</span>
				<span className="text-sm font-medium">{option.text}</span>
			</div>

			{isCorrectOption ? (
				<span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
					✓ Correct
				</span>
			) : null}
			{isWrongSelection ? (
				<span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
					✗ Selected
				</span>
			) : null}
		</button>
	);
}

export function InteractiveOverlayEngine({
	onAnswer,
	options,
	state,
}: InteractiveOverlayEngineProps) {
	const isUnanswered = state.status === "unanswered";

	return (
		<fieldset className="space-y-3">
			<legend className="sr-only">Scenario choices</legend>
			{options.map((option, index) => {
				const isSelected =
					state.status === "answered" && state.selectedOptionId === option.id;
				const isCorrectOption =
					(state.status === "answered" || state.status === "timedOut") &&
					state.correctOptionId === option.id;
				const isWrongSelection =
					state.status === "answered" && isSelected && !state.isCorrect;

				return (
					<MultipleChoiceOptionButton
						isCorrectOption={isCorrectOption}
						isUnanswered={isUnanswered}
						isWrongSelection={isWrongSelection}
						key={option.id}
						onAnswer={onAnswer}
						option={option}
						optionNumber={index + 1}
					/>
				);
			})}
		</fieldset>
	);
}
