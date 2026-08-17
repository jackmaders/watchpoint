"use client";

import { useEffect, useId, useRef } from "react";
import { MODULE_MAP } from "../model/modules";
import { SCENARIO_CHOICE_SHORTCUTS } from "../model/scenario-choice-shortcuts";
import type {
	ScenarioData,
	ScenarioOption,
	ScenarioOverlayState,
} from "../model/session-contract";
import { InteractiveOverlayEngine } from "./interactive-overlay-engine";

export interface ScenarioOverlayProps {
	onReplayContext?: () => void;
	onResume: () => void;
	onSkipUnsupportedInput?: () => void;
	onSelectOption: (optionId: string) => void;
	remainingMs?: number;
	scenario: ScenarioData;
	state: ScenarioOverlayState;
	totalMs?: number;
}

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
				data-testid="resume-playback-button"
				onClick={onResume}
				type="button"
			>
				Resume Playback
			</button>
		</div>
	);
}

function useOverlayHotkeys(
	isUnanswered: boolean,
	options: ScenarioOption[],
	onSelectOption: (id: string) => void,
	scenarioId: string,
) {
	const claimedShortcutScenarioRef = useRef<string | null>(null);
	const isUnansweredRef = useRef(isUnanswered);
	isUnansweredRef.current = isUnanswered;

	useEffect(() => {
		if (!isUnanswered) {
			claimedShortcutScenarioRef.current = null;
			return;
		}

		const handleKeyDown = (event: KeyboardEvent) => {
			if (
				!isUnansweredRef.current ||
				claimedShortcutScenarioRef.current === scenarioId
			)
				return;

			if (event.key === "Escape") {
				event.preventDefault();
				return;
			}

			const targetOption = getKeyboardShortcutOption(event, options);
			if (!targetOption) return;

			claimedShortcutScenarioRef.current = scenarioId;
			onSelectOption(targetOption.id);
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [isUnanswered, options, onSelectOption, scenarioId]);
}

function getKeyboardShortcutOption(
	event: KeyboardEvent,
	options: ScenarioOption[],
): ScenarioOption | undefined {
	if (isKeyboardEditableTarget(event.target)) return undefined;

	const optionIndex = SCENARIO_CHOICE_SHORTCUTS.indexOf(
		event.key as (typeof SCENARIO_CHOICE_SHORTCUTS)[number],
	);
	return optionIndex >= 0 ? options[optionIndex] : undefined;
}

function isKeyboardEditableTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;

	return (
		target instanceof HTMLInputElement ||
		target instanceof HTMLTextAreaElement ||
		target instanceof HTMLSelectElement ||
		target.isContentEditable ||
		target.closest("[contenteditable='true']") !== null
	);
}

export function ScenarioOverlay({
	onReplayContext,
	onResume,
	onSkipUnsupportedInput,
	onSelectOption,
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
	const options =
		scenario.input.kind === "multiple-choice" ? scenario.input.options : [];

	useOverlayHotkeys(isUnanswered, options, onSelectOption, scenario.id);

	return (
		<div
			aria-labelledby={promptId}
			aria-modal="true"
			className="relative flex flex-col lg:flex-row w-full h-full bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden shadow-2xl"
			data-input-type={scenario.inputType}
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
						<img
							alt="Scenario tactical diagram"
							className="w-full h-auto object-cover max-h-48"
							height={200}
							src={scenario.imageUrl}
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
					{scenario.input.kind === "multiple-choice" ? (
						<InteractiveOverlayEngine
							onAnswer={onSelectOption}
							options={options}
							state={state}
						/>
					) : (
						<>
							<p
								className="rounded-xl border border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-400"
								data-testid="unsupported-scenario-input"
							>
								This scenario input is not available yet.
							</p>
							<button
								className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-indigo-500"
								data-testid="skip-unsupported-input-button"
								onClick={onSkipUnsupportedInput}
								type="button"
							>
								Continue Playback
							</button>
						</>
					)}
				</div>

				{isUnanswered && onReplayContext ? (
					<button
						className="w-full py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
						data-testid="replay-context-button"
						onClick={onReplayContext}
						type="button"
					>
						↺ Replay Context (-10s)
					</button>
				) : null}

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
