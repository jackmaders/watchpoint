"use client";

import Image from "next/image";
import { useCallback, useEffect, useId } from "react";
import type { ModuleType } from "@/shared/db";

export interface ScenarioOption {
	id: string;
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

export interface ScenarioOverlayProps {
	onSelectOption: (optionId: string) => void;
	onResume: () => void;
	remainingMs?: number;
	scenario: ScenarioData;
	state: ScenarioOverlayState;
	totalMs?: number;
}

import { MODULE_MAP } from "../model/modules";

interface ScenarioTimerGaugeProps {
	remainingMs: number;
	totalMs: number;
}

function ScenarioTimerGauge({ remainingMs, totalMs }: ScenarioTimerGaugeProps) {
	const isCritical = remainingMs <= 1000;
	const timerSeconds = (remainingMs / 1000).toFixed(1);
	const progressPercent = Math.max(0, Math.min(1, remainingMs / totalMs));
	const radius = 18;
	const circumference = 2 * Math.PI * radius;
	const strokeDashoffset = circumference * (1 - progressPercent);

	return (
		<div
			className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-colors ${
				isCritical
					? "border-rose-500/60 bg-rose-950/50 text-rose-400 animate-pulse ring-1 ring-rose-500/50"
					: "border-slate-700 bg-slate-800/80 text-slate-300"
			}`}
			data-testid="scenario-timer-gauge"
		>
			<svg
				aria-hidden="true"
				className="w-5 h-5 -rotate-90 transform"
				viewBox="0 0 44 44"
			>
				<circle
					className="text-slate-700"
					cx="22"
					cy="22"
					fill="transparent"
					r={radius}
					stroke="currentColor"
					strokeWidth="4"
				/>
				<circle
					className={`transition-all duration-100 ${
						isCritical ? "text-rose-500" : "text-indigo-400"
					}`}
					cx="22"
					cy="22"
					fill="transparent"
					r={radius}
					stroke="currentColor"
					strokeDasharray={circumference}
					strokeDashoffset={strokeDashoffset}
					strokeLinecap="round"
					strokeWidth="4"
				/>
			</svg>
			<span className="text-xs font-mono font-bold">{timerSeconds}s</span>
		</div>
	);
}

interface ScenarioOptionButtonProps {
	hotkeyNumber: number;
	isCorrectOption: boolean;
	isUnanswered: boolean;
	isWrongSelection: boolean;
	onSelect: (id: string) => void;
	option: ScenarioOption;
}

function ScenarioOptionButton({
	hotkeyNumber,
	isCorrectOption,
	isUnanswered,
	isWrongSelection,
	onSelect,
	option,
}: ScenarioOptionButtonProps) {
	const handleClick = useCallback(() => {
		onSelect(option.id);
	}, [onSelect, option.id]);

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
					{hotkeyNumber}
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

interface ScenarioFeedbackPanelProps {
	explanationText: string;
	onResume: () => void;
	state: Exclude<ScenarioOverlayState, { status: "unanswered" }>;
}

function ScenarioFeedbackPanel({
	explanationText,
	onResume,
	state,
}: ScenarioFeedbackPanelProps) {
	const isPass = state.status === "answered" && state.isCorrect;
	const label =
		state.status === "timedOut" ? "TIME EXPIRED" : isPass ? "PASS" : "FAIL";

	return (
		<div
			aria-live="polite"
			className={`p-4 rounded-xl border space-y-3 ${
				isPass
					? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
					: "bg-rose-950/40 border-rose-500/40 text-rose-300"
			}`}
			role="status"
		>
			<div className="flex items-center justify-between">
				<span className="text-xs font-black tracking-widest uppercase px-2.5 py-0.5 rounded bg-slate-950/60 border border-current">
					{label}
				</span>
			</div>

			<p className="text-xs text-slate-300 leading-relaxed">
				{explanationText}
			</p>

			<button
				className="w-full mt-2 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-indigo-600/20"
				onClick={onResume}
				type="button"
			>
				Resume Playback
			</button>
		</div>
	);
}

export function ScenarioOverlay({
	onSelectOption,
	onResume,
	remainingMs,
	scenario,
	state,
	totalMs,
}: ScenarioOverlayProps) {
	const promptId = useId();
	const moduleInfo = MODULE_MAP[scenario.moduleType];
	const isUnanswered = state.status === "unanswered";

	const hasValidTimer =
		scenario.moduleType !== "STRATEGY" &&
		typeof totalMs === "number" &&
		totalMs > 0 &&
		typeof remainingMs === "number";

	useEffect(() => {
		if (!isUnanswered) return;

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.preventDefault();
				return;
			}

			const keyNum = Number.parseInt(event.key, 10);
			if (
				!Number.isNaN(keyNum) &&
				keyNum >= 1 &&
				keyNum <= scenario.inputConfig.options.length
			) {
				const targetOption = scenario.inputConfig.options[keyNum - 1];
				onSelectOption(targetOption.id);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [isUnanswered, scenario.inputConfig.options, onSelectOption]);

	return (
		<div
			aria-labelledby={promptId}
			aria-modal="true"
			className="relative flex flex-col lg:flex-row w-full h-full bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden shadow-2xl"
			role="dialog"
		>
			<div className="w-full lg:w-[35%] flex flex-col justify-between p-6 bg-slate-900/95 border-b lg:border-b-0 lg:border-l border-slate-800/80 overflow-y-auto space-y-6">
				<div className="flex items-center justify-between gap-4">
					<span
						className={`text-xs font-bold px-2.5 py-1 rounded-md border ${moduleInfo.badge}`}
					>
						{moduleInfo.label}
					</span>

					{hasValidTimer &&
					totalMs !== undefined &&
					remainingMs !== undefined ? (
						<ScenarioTimerGauge remainingMs={remainingMs} totalMs={totalMs} />
					) : null}
				</div>

				{scenario.imageUrl ? (
					<div className="rounded-xl overflow-hidden border border-slate-800 shadow-md">
						<Image
							alt="Scenario tactical diagram"
							className="w-full h-auto object-cover max-h-48"
							height={200}
							src={scenario.imageUrl}
							unoptimized
							width={400}
						/>
					</div>
				) : null}

				<div className="space-y-2">
					<span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
						Tactical Decision Point
					</span>
					<h3
						className="text-lg font-bold text-white leading-snug"
						id={promptId}
					>
						{scenario.promptText}
					</h3>
				</div>

				<div className="space-y-3">
					{scenario.inputConfig.options.map((option, index) => {
						const isSelected =
							state.status === "answered" &&
							state.selectedOptionId === option.id;
						const isCorrectOption =
							(state.status === "answered" || state.status === "timedOut") &&
							state.correctOptionId === option.id;
						const isWrongSelection = isSelected && !state.isCorrect;

						return (
							<ScenarioOptionButton
								hotkeyNumber={index + 1}
								isCorrectOption={isCorrectOption}
								isUnanswered={isUnanswered}
								isWrongSelection={isWrongSelection}
								key={option.id}
								onSelect={onSelectOption}
								option={option}
							/>
						);
					})}
				</div>

				{!isUnanswered ? (
					<ScenarioFeedbackPanel
						explanationText={scenario.explanationText}
						onResume={onResume}
						state={state}
					/>
				) : null}
			</div>
		</div>
	);
}
