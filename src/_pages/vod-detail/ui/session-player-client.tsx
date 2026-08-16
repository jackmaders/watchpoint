"use client";

import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { MODULE_MAP } from "@/entities/scenario";
import { formatDuration } from "@/shared/lib/utils";
import type { VodContainerRef } from "@/shared/media";
import { extractHeroFromTitle } from "../model/module-filter";
import {
	type ManifestVod,
	type ScenarioItem,
	useSessionPlayer,
} from "../model/use-session-player";
import {
	type ScenarioData,
	ScenarioOverlay,
	type ScenarioOverlayState,
} from "./scenario-overlay";
import { SessionSummaryPanel } from "./session-summary-panel";

export interface SessionPlayerClientProps {
	modulesParam?: string | null;
	vod: ManifestVod;
}

interface SessionPlayerHeaderProps {
	activeCount: number;
	currentIndex: number;
	hero: string | null;
	vod: ManifestVod;
}

function SessionPlayerHeader({
	activeCount,
	currentIndex,
	hero,
	vod,
}: SessionPlayerHeaderProps) {
	return (
		<header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
			<div className="space-y-1">
				<div className="flex items-center gap-2 flex-wrap">
					<Link
						className="text-xs font-semibold text-slate-400 hover:text-indigo-400 transition-colors mr-2 inline-flex items-center gap-1"
						params={{ id: vod.id }}
						to="/vods/$id"
					>
						← Exit Session
					</Link>
					<span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
						{vod.mapName}
					</span>
					<span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
						{vod.rankTier}
					</span>
					{hero ? (
						<span className="px-2 py-0.5 rounded text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
							Hero: {hero}
						</span>
					) : null}
				</div>
				<h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
					{vod.title}
				</h1>
			</div>

			<div className="flex items-center gap-3 self-start sm:self-auto">
				<span className="text-xs text-slate-400 font-medium">Progress:</span>
				<span className="px-3 py-1 bg-slate-800 border border-slate-700 text-slate-200 font-mono font-bold text-xs rounded-full">
					Scenario {Math.min(currentIndex + 1, activeCount)} / {activeCount}
				</span>
			</div>
		</header>
	);
}

interface SessionPlayerControlsProps {
	activeScenarios: ScenarioItem[];
	currentTime: number;
	duration: number;
	isPlaying: boolean;
	onPause: () => void;
	onPlay: () => void;
	onReplayContext: () => void;
}

function SessionPlayerControls({
	activeScenarios,
	currentTime,
	duration,
	isPlaying,
	onPause,
	onPlay,
	onReplayContext,
}: SessionPlayerControlsProps) {
	const progressPercent =
		duration > 0
			? Math.min(100, Math.max(0, (currentTime / duration) * 100))
			: 0;

	return (
		<div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 backdrop-blur-sm space-y-3">
			<div className="relative w-full h-2 bg-slate-800 rounded-full overflow-hidden">
				<div
					className="h-full bg-indigo-500 transition-all duration-100"
					style={{ width: `${progressPercent}%` }}
				/>
				{activeScenarios.map((sc) => {
					const markerPos =
						duration > 0 ? (sc.timestampSeconds / duration) * 100 : 0;
					const modDef = MODULE_MAP[sc.moduleType];
					return (
						<div
							className="absolute top-0 bottom-0 w-1 bg-amber-400 rounded-full -translate-x-1/2"
							key={sc.id}
							style={{ left: `${markerPos}%` }}
							title={`${modDef.label} Scenario @ ${formatDuration(sc.timestampSeconds)}`}
						/>
					);
				})}
			</div>

			<div className="flex items-center justify-between flex-wrap gap-4 pt-1">
				<div className="flex items-center gap-3">
					<button
						aria-label={isPlaying ? "Pause Video" : "Play Video"}
						className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20 active:scale-95"
						data-testid="play-pause-button"
						onClick={isPlaying ? onPause : onPlay}
						type="button"
					>
						{isPlaying ? "❚❚ Pause" : "▶ Play"}
					</button>

					<button
						className="px-3.5 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
						data-testid="replay-context-button"
						onClick={onReplayContext}
						type="button"
					>
						↺ Replay 10s
					</button>
				</div>

				<div className="flex items-center gap-4 text-xs font-mono font-medium text-slate-400">
					<span>
						{formatDuration(currentTime)} / {formatDuration(duration)}
					</span>
				</div>
			</div>
		</div>
	);
}

interface SessionPlayerViewportProps {
	containerRef: VodContainerRef;
	isCompleted: boolean;
	isLoading: boolean;
	isOverlayVisible: boolean;
	onReplayContext: () => void;
	onResume: () => void;
	onSelectOption: (id: string) => void;
	overlayScenarioData: ScenarioData | null;
	overlayState: ScenarioOverlayState | null;
	remainingMs?: number;
	totalMs?: number;
}

function SessionPlayerViewport({
	containerRef,
	isCompleted,
	isLoading,
	isOverlayVisible,
	onReplayContext,
	onResume,
	onSelectOption,
	overlayScenarioData,
	overlayState,
	remainingMs,
	totalMs,
}: SessionPlayerViewportProps) {
	return (
		<div
			className={
				isCompleted
					? "hidden"
					: "relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl"
			}
		>
			<div className="w-full h-full" ref={containerRef} />

			{isLoading ? (
				<div
					className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center space-y-4 z-20"
					data-testid="player-loading"
				>
					<div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
					<p className="text-sm font-semibold text-slate-400">
						Initializing Video Stream...
					</p>
				</div>
			) : null}

			{isOverlayVisible && overlayScenarioData && overlayState ? (
				<div className="absolute inset-0 z-30 p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center">
					<ScenarioOverlay
						onReplayContext={onReplayContext}
						onResume={onResume}
						onSelectOption={onSelectOption}
						remainingMs={remainingMs}
						scenario={overlayScenarioData}
						state={overlayState}
						totalMs={totalMs}
					/>
				</div>
			) : null}
		</div>
	);
}

function toScenarioData(scenario: ScenarioItem | null): ScenarioData | null {
	if (!scenario) return null;
	const options =
		(scenario.inputConfig as { options: { id: string; text: string }[] })
			?.options ?? [];
	return {
		explanationText: scenario.explanationText,
		id: scenario.id,
		imageUrl: scenario.imageUrl,
		inputConfig: { options },
		moduleType: scenario.moduleType,
		promptText: scenario.promptText,
		timeLimitSeconds: scenario.timeLimitSeconds,
	};
}

export function SessionPlayerClient({
	modulesParam,
	vod,
}: SessionPlayerClientProps) {
	const hero = extractHeroFromTitle(vod.title);

	const {
		activeScenarioIndex,
		activeScenarios,
		containerRef,
		currentScenario,
		currentTime,
		duration,
		exitSession,
		overlayState,
		pause,
		play,
		remainingMs,
		replayContext,
		resumePlayback,
		retrySession,
		selectOption,
		state,
		summary,
		totalMs,
	} = useSessionPlayer({
		activeModuleKeys: modulesParam ? modulesParam.split(",") : undefined,
		initialManifest: vod,
		vodId: vod.id,
	});

	const effectiveDuration = duration > 0 ? duration : vod.durationSeconds;
	const overlayScenarioData = useMemo(
		() => toScenarioData(currentScenario),
		[currentScenario],
	);
	const isCompleted = state === "COMPLETED" && summary !== null;
	const isOverlayVisible =
		(state === "SCENARIO_ACTIVE" || state === "FEEDBACK") &&
		currentScenario !== null &&
		overlayState !== null;

	return (
		<div className="space-y-6 max-w-6xl mx-auto">
			{isCompleted ? (
				<div className="py-8 px-4 max-w-6xl mx-auto">
					<SessionSummaryPanel
						onExit={exitSession}
						onRetry={retrySession}
						summary={summary}
					/>
				</div>
			) : (
				<SessionPlayerHeader
					activeCount={activeScenarios.length}
					currentIndex={activeScenarioIndex}
					hero={hero}
					vod={vod}
				/>
			)}

			<SessionPlayerViewport
				containerRef={containerRef}
				isCompleted={isCompleted}
				isLoading={state === "LOADING"}
				isOverlayVisible={isOverlayVisible}
				onReplayContext={replayContext}
				onResume={resumePlayback}
				onSelectOption={selectOption}
				overlayScenarioData={overlayScenarioData}
				overlayState={overlayState}
				remainingMs={remainingMs}
				totalMs={totalMs}
			/>

			{!isCompleted ? (
				<SessionPlayerControls
					activeScenarios={activeScenarios}
					currentTime={currentTime}
					duration={effectiveDuration}
					isPlaying={state === "PLAYING"}
					onPause={pause}
					onPlay={play}
					onReplayContext={replayContext}
				/>
			) : null}
		</div>
	);
}
