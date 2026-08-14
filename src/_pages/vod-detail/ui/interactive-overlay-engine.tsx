"use client";

import type { MouseEvent } from "react";
import { useCallback } from "react";
import type { ModuleType } from "@/shared/db";

export interface MultipleChoiceOption {
	id: string;
	text: string;
}

export interface MultipleChoiceScenario {
	id: string;
	inputConfig: {
		options: MultipleChoiceOption[];
	};
	inputType: "MULTIPLE_CHOICE";
	moduleType: ModuleType;
	promptText: string;
}

export interface InteractiveOverlayEngineProps {
	answered?: boolean;
	onAnswer: (optionId: string) => void;
	scenario: MultipleChoiceScenario;
}

export function InteractiveOverlayEngine({
	answered = false,
	onAnswer,
	scenario,
}: InteractiveOverlayEngineProps) {
	const handleChoiceClick = useCallback(
		(event: MouseEvent<HTMLButtonElement>) => {
			onAnswer(event.currentTarget.value);
		},
		[onAnswer],
	);

	return (
		<section aria-label="Interactive Scenario" className="space-y-5">
			<div className="space-y-2">
				<p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">
					{scenario.moduleType} Scenario
				</p>
				<h2 className="text-2xl font-bold text-white">{scenario.promptText}</h2>
			</div>

			<fieldset className="grid gap-3">
				<legend className="sr-only">Scenario choices</legend>
				{scenario.inputConfig.options.map((option) => (
					<button
						className="flex items-center justify-between gap-4 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-left text-slate-100 transition-colors hover:border-indigo-400 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
						disabled={answered}
						key={option.id}
						onClick={handleChoiceClick}
						type="button"
						value={option.id}
					>
						<span>{option.text}</span>
					</button>
				))}
			</fieldset>
		</section>
	);
}
