/**
 * Decision overlay component presented when VOD playback pauses at an interactive scenario timestamp.
 *
 * Implements `ScenarioOverlay` with countdown gauges (`ScenarioTimerGauge`), keyboard shortcut listeners,
 * contextual replay triggers, educational explanations, and resume actions across all 5 learning module types.
 */
"use client";

import { useEffect, useId, useRef } from "react";
import { MODULE_MAP } from "@/entities/vod";
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
			aria-label={`${timerSeconds} seconds remaining`}
			className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-colors ${
				isCritical
					? "border-destructive/60 bg-destructive/10 text-destructive animate-pulse ring-1 ring-destructive/50 motion-reduce:animate-none"
					: "border-border bg-muted text-muted-foreground"
			}`}
			role="timer"
		>
			<svg
				aria-hidden="true"
				className="w-5 h-5 -rotate-90 transform"
				viewBox="0 0 44 44"
			>
				<circle
					className="text-border"
					cx="22"
					cy="22"
					fill="transparent"
					r={radius}
					stroke="currentColor"
					strokeWidth="4"
				/>
				<circle
					className={`transition-all duration-100 ${
						isCritical ? "text-destructive" : "text-primary"
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
			className={`p-4 rounded-lg border space-y-3 ${
				isPass
					? "bg-accent border-border text-accent-foreground"
					: "bg-destructive/10 border-destructive/40 text-destructive"
			}`}
			role="status"
		>
			<div className="flex items-center justify-between">
				<span className="text-xs font-black tracking-widest uppercase px-2.5 py-0.5 rounded bg-background/60 border border-current">
					{label}
				</span>
			</div>

			<p className="text-xs text-muted-foreground leading-relaxed">
				{explanationText}
			</p>

			<button
				className="w-full mt-2 py-2.5 px-4 rounded-md bg-primary hover:bg-primary/90 active:scale-[0.98] text-primary-foreground text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
			className="relative flex flex-col lg:flex-row w-full h-full bg-background/80 backdrop-blur-md border border-border rounded-lg overflow-hidden shadow-lg"
			data-input-type={scenario.inputType}
			role="dialog"
		>
			<div className="w-full lg:w-[35%] flex flex-col justify-between p-4 sm:p-6 bg-card/95 border-b lg:border-b-0 lg:border-l border-border overflow-y-auto space-y-6">
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
					<div className="rounded-lg overflow-hidden border border-border shadow-sm">
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
					<span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider font-mono">
						Tactical Decision Point
					</span>
					<h3
						className="text-lg font-bold text-card-foreground leading-snug"
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
							<p className="rounded-md border border-border bg-background/60 p-4 text-sm text-muted-foreground">
								This scenario input is not available yet.
							</p>
							<button
								className="w-full rounded-md bg-primary px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground transition-all hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
						className="w-full py-2.5 px-4 rounded-md border border-input bg-secondary hover:bg-accent hover:text-accent-foreground text-secondary-foreground text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						onClick={onReplayContext}
						type="button"
					>
						↺ Replay 10s
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
