"use client";

import { useCallback } from "react";
import { SCENARIO_CHOICE_SHORTCUTS } from "../model/scenario-choice-shortcuts";
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
	shortcut: (typeof SCENARIO_CHOICE_SHORTCUTS)[number];
}

function MultipleChoiceOptionButton({
	isCorrectOption,
	isUnanswered,
	isWrongSelection,
	onAnswer,
	option,
	shortcut,
}: MultipleChoiceOptionButtonProps) {
	const handleClick = useCallback(() => {
		onAnswer(option.id);
	}, [onAnswer, option.id]);

	let buttonStyle =
		"border-border bg-background/60 text-foreground hover:border-primary hover:bg-accent cursor-pointer";

	if (!isUnanswered) {
		if (isCorrectOption) {
			buttonStyle =
				"border-border bg-accent text-accent-foreground ring-1 ring-ring";
		} else if (isWrongSelection) {
			buttonStyle =
				"border-destructive bg-destructive/10 text-destructive ring-1 ring-destructive";
		} else {
			buttonStyle =
				"border-border/50 bg-muted/30 text-muted-foreground opacity-50";
		}
	}

	return (
		<button
			aria-disabled={!isUnanswered}
			aria-keyshortcuts={shortcut}
			className={`w-full flex items-center justify-between p-4 rounded-md border text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${buttonStyle}`}
			disabled={!isUnanswered}
			onClick={handleClick}
			type="button"
		>
			<div className="flex items-center gap-3">
				<kbd className="flex items-center justify-center w-6 h-6 rounded-md bg-muted border border-border text-xs font-mono font-bold text-muted-foreground">
					{shortcut}
				</kbd>
				<span className="text-sm font-medium">{option.text}</span>
			</div>

			{isCorrectOption ? (
				<span className="text-xs font-bold text-accent-foreground uppercase tracking-wider">
					✓ Correct
				</span>
			) : null}
			{isWrongSelection ? (
				<span className="text-xs font-bold text-destructive uppercase tracking-wider">
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
	// V1 keyboard and presentation shortcuts support choices A through D only.
	const renderedOptions = options.slice(0, SCENARIO_CHOICE_SHORTCUTS.length);

	return (
		<fieldset className="space-y-3">
			<legend className="sr-only">Scenario choices</legend>
			{renderedOptions.map((option, index) => {
				const shortcut = SCENARIO_CHOICE_SHORTCUTS[
					index
				] as (typeof SCENARIO_CHOICE_SHORTCUTS)[number];
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
						shortcut={shortcut}
					/>
				);
			})}
		</fieldset>
	);
}
