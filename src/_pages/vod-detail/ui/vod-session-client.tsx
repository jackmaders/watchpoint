"use client";

import { useCallback, useState } from "react";
import {
	InteractiveOverlayEngine,
	type MultipleChoiceOption,
	type MultipleChoiceScenario,
} from "./interactive-overlay-engine";

export interface SessionOption extends MultipleChoiceOption {
	isCorrect: boolean;
}

export interface SessionScenario
	extends Omit<MultipleChoiceScenario, "inputConfig"> {
	explanationText: string;
	inputConfig: {
		options: SessionOption[];
	};
}

interface VodSessionClientProps {
	onAnswer?: (scenarioId: string, optionId: string, isCorrect: boolean) => void;
	scenarios: SessionScenario[];
}

export function VodSessionClient({
	onAnswer,
	scenarios,
}: VodSessionClientProps) {
	const [activeScenarioIndex, setActiveScenarioIndex] = useState(0);
	const [answer, setAnswer] = useState<SessionOption | null>(null);
	const activeScenario = scenarios[activeScenarioIndex] ?? null;

	const handleAnswer = useCallback(
		(optionId: string) => {
			if (!activeScenario) {
				return;
			}

			const selectedOption = activeScenario.inputConfig.options.find(
				(option) => option.id === optionId,
			) as SessionOption;

			setAnswer(selectedOption);
			onAnswer?.(
				activeScenario.id,
				selectedOption.id,
				selectedOption.isCorrect,
			);
		},
		[activeScenario, onAnswer],
	);

	const handleNextScenario = useCallback(() => {
		setActiveScenarioIndex((index) => index + 1);
		setAnswer(null);
	}, []);

	if (!activeScenario) {
		return (
			<section
				aria-label="Interactive Scenario"
				className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-slate-300"
			>
				No active Scenarios
			</section>
		);
	}

	return (
		<section className="space-y-6">
			<InteractiveOverlayEngine
				answered={answer !== null}
				onAnswer={handleAnswer}
				scenario={activeScenario}
			/>

			{answer !== null && (
				<div
					aria-live="polite"
					className="space-y-4 rounded-xl border border-slate-700 bg-slate-900/80 p-5"
				>
					<p
						className={`text-lg font-bold ${
							answer.isCorrect ? "text-emerald-300" : "text-rose-300"
						}`}
					>
						{answer.isCorrect ? "PASS" : "FAIL"}
					</p>
					<p className="text-sm text-slate-300">
						{activeScenario.explanationText}
					</p>
					{activeScenarioIndex < scenarios.length - 1 && (
						<button
							className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
							onClick={handleNextScenario}
							type="button"
						>
							Next Scenario
						</button>
					)}
				</div>
			)}
		</section>
	);
}
