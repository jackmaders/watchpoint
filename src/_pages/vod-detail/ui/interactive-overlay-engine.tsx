"use client";

import type { MouseEvent } from "react";
import { useCallback, useEffect, useRef } from "react";
import type { InputType, ModuleType } from "@/shared/db";

export interface MultipleChoiceOption {
	id: string;
	text: string;
}

export interface MultipleChoiceScenario {
	id: string;
	inputConfig: {
		options: MultipleChoiceOption[];
	};
	inputType: InputType;
	moduleType: ModuleType;
	promptText: string;
}

interface InteractiveOverlayEngineProps {
	onAnswer: (optionId: string) => void;
	scenario: MultipleChoiceScenario | null;
	answered?: boolean;
}

const SHORTCUT_KEYS = ["1", "2", "3", "4"] as const;

function isShortcutKey(key: string): key is (typeof SHORTCUT_KEYS)[number] {
	return SHORTCUT_KEYS.includes(key as (typeof SHORTCUT_KEYS)[number]);
}

function isInputCapableTarget(target: EventTarget | null) {
	return (
		target instanceof Element &&
		target.closest(
			"input, textarea, select, [contenteditable='true'], [contenteditable=''], [role='textbox'], [role='combobox']",
		) !== null
	);
}

export function InteractiveOverlayEngine({
	onAnswer,
	scenario,
	answered = false,
}: InteractiveOverlayEngineProps) {
	const answeredScenarioId = useRef<string | null>(null);

	const selectOption = useCallback(
		(optionId: string) => {
			if (!scenario || answered || answeredScenarioId.current === scenario.id) {
				return;
			}

			answeredScenarioId.current = scenario.id;
			onAnswer(optionId);
		},
		[answered, onAnswer, scenario],
	);
	const handleOptionClick = useCallback(
		(event: MouseEvent<HTMLButtonElement>) => {
			selectOption(event.currentTarget.value);
		},
		[selectOption],
	);

	useEffect(() => {
		if (scenario?.inputType !== "MULTIPLE_CHOICE" || answered) {
			return;
		}
		const activeScenario = scenario;

		function handleKeyDown(event: KeyboardEvent) {
			if (isInputCapableTarget(event.target) || !isShortcutKey(event.key)) {
				return;
			}

			const option = activeScenario.inputConfig.options[Number(event.key) - 1];
			if (!option) {
				return;
			}

			event.preventDefault();
			selectOption(option.id);
		}

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [answered, scenario, selectOption]);

	if (scenario?.inputType !== "MULTIPLE_CHOICE") {
		return null;
	}

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
				{scenario.inputConfig.options.map((option, index) => {
					const shortcut = String(index + 1);
					const shortcutId = `${scenario.id}-${option.id}-shortcut`;

					return (
						<button
							aria-describedby={shortcutId}
							aria-keyshortcuts={shortcut}
							className="flex items-center justify-between gap-4 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-left text-slate-100 transition-colors hover:border-indigo-400 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
							disabled={answered}
							key={option.id}
							onClick={handleOptionClick}
							type="button"
							value={option.id}
						>
							<span>{option.text}</span>
							<kbd
								className="inline-flex min-w-7 items-center justify-center rounded-md border border-slate-600 bg-slate-950 px-2 py-1 text-xs font-bold text-indigo-300"
								id={shortcutId}
							>
								{shortcut}
							</kbd>
						</button>
					);
				})}
			</fieldset>
		</section>
	);
}
