"use client";

import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatDuration } from "@/shared/lib/utils";
import type { VodContainerRef } from "@/shared/media";
import { extractHeroFromTitle } from "../model/module-filter";
import { MODULE_MAP } from "../model/modules";
import {
	type ScenarioData,
	type ScenarioOverlayState,
	toScenarioOverlayData,
} from "../model/session-contract";
import {
	type ManifestVod,
	type ScenarioItem,
	useSessionPlayer,
} from "../model/use-session-player";
import { ScenarioOverlay } from "./scenario-overlay";
import { SessionSummaryPanel } from "./session-summary-panel";

export interface SessionPlayerClientProps {
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
		<header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
			<div className="space-y-1">
				<div className="flex items-center gap-2 flex-wrap">
					<Link
						className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors mr-2 inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						params={{ id: vod.id }}
						to="/vods/$id"
					>
						← Exit Session
					</Link>
					<span className="px-2 py-0.5 rounded text-xs font-bold bg-accent text-accent-foreground border border-border">
						{vod.mapName}
					</span>
					<span className="px-2 py-0.5 rounded text-xs font-bold bg-secondary text-secondary-foreground border border-border">
						{vod.rankTier}
					</span>
					{hero ? (
						<span className="px-2 py-0.5 rounded text-xs font-bold bg-primary/10 text-primary border border-primary/40">
							Hero: {hero}
						</span>
					) : null}
				</div>
				<h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
					{vod.title}
				</h1>
			</div>

			<div className="flex items-center gap-3 self-start sm:self-auto">
				<span className="text-xs text-muted-foreground font-medium">
					Progress:
				</span>
				<span className="px-3 py-1 bg-muted border border-border text-muted-foreground font-mono font-bold text-xs rounded-md">
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
		<div className="rounded-lg border border-border bg-card p-4 shadow-sm space-y-3">
			<div className="relative w-full h-2 bg-muted rounded-full overflow-hidden">
				<div
					className="h-full bg-primary transition-all duration-100 motion-reduce:transition-none"
					style={{ width: `${progressPercent}%` }}
				/>
				{activeScenarios.map((sc) => {
					const markerPos =
						duration > 0 ? (sc.timestampSeconds / duration) * 100 : 0;
					const modDef = MODULE_MAP[sc.moduleType];
					return (
						<div
							className="absolute top-0 bottom-0 w-1 bg-accent rounded-full -translate-x-1/2"
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
						className="px-4 py-2 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
						onClick={isPlaying ? onPause : onPlay}
						type="button"
					>
						{isPlaying ? "❚❚ Pause" : "▶ Play"}
					</button>

					<button
						className="px-3.5 py-2 rounded-md border border-input bg-secondary hover:bg-accent hover:text-accent-foreground text-secondary-foreground text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						onClick={onReplayContext}
						type="button"
					>
						↺ Replay 10s
					</button>
				</div>

				<div className="flex items-center gap-4 text-xs font-mono font-medium text-muted-foreground">
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
	mediaHealth: "loading" | "ready" | "buffering" | "recovering" | "failed";
	onRetryMedia: () => void;
	onRestartSession: () => void;
	onReplayContext: () => void;
	onResume: () => void;
	onSkipUnsupportedInput: () => void;
	onSelectOption: (id: string) => void;
	overlayScenarioData: ScenarioData | null;
	overlayState: ScenarioOverlayState | null;
	remainingMs?: number;
	totalMs?: number;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: the viewport owns the layered player states at the established UI seam.
export function SessionPlayerViewport({
	containerRef,
	isCompleted,
	isLoading,
	isOverlayVisible,
	mediaHealth,
	onRetryMedia,
	onRestartSession,
	onReplayContext,
	onResume,
	onSkipUnsupportedInput,
	onSelectOption,
	overlayScenarioData,
	overlayState,
	remainingMs,
	totalMs,
}: SessionPlayerViewportProps) {
	const recoveryHeadingRef = useRef<HTMLHeadingElement>(null);
	const previousMediaHealthRef = useRef<typeof mediaHealth | undefined>(
		undefined,
	);
	const [announcement, setAnnouncement] = useState("");
	const isBlockingRecovery =
		mediaHealth === "recovering" || mediaHealth === "failed";

	useEffect(() => {
		if (isBlockingRecovery && previousMediaHealthRef.current !== mediaHealth) {
			recoveryHeadingRef.current?.focus();
		}
		if (
			previousMediaHealthRef.current === "recovering" &&
			mediaHealth === "ready"
		) {
			setAnnouncement("Playback resumed. Your session progress is preserved.");
		}
		previousMediaHealthRef.current = mediaHealth;
	}, [isBlockingRecovery, mediaHealth]);

	return (
		<section
			aria-label="Session media player"
			className={
				isCompleted
					? "hidden"
					: "relative aspect-video w-full rounded-lg overflow-hidden bg-background border border-border shadow-lg"
			}
		>
			<div className="w-full h-full" ref={containerRef} />

			{announcement ? (
				<div className="sr-only" role="status">
					{announcement}
				</div>
			) : null}

			{isLoading ? (
				<div
					className="absolute inset-0 bg-background flex flex-col items-center justify-center space-y-4 z-20"
					role="status"
				>
					<div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin motion-reduce:animate-none" />
					<p className="text-sm font-semibold text-muted-foreground">
						Initializing Video Stream...
					</p>
				</div>
			) : null}

			{mediaHealth === "buffering" ? (
				<div
					className="absolute left-3 top-3 z-20 rounded-md bg-background/85 px-3 py-2 text-xs font-semibold text-foreground shadow-sm"
					role="status"
				>
					Buffering…
				</div>
			) : null}

			{isBlockingRecovery ? (
				<div
					aria-live="assertive"
					className="absolute inset-0 z-40 flex items-center justify-center bg-background/95 p-6 text-center"
					role="alert"
				>
					<div className="max-w-sm space-y-4">
						<h2
							className="text-lg font-bold text-foreground"
							ref={recoveryHeadingRef}
							tabIndex={-1}
						>
							{mediaHealth === "recovering"
								? "Recovering video…"
								: "Video playback is unavailable"}
						</h2>
						<p className="text-sm text-muted-foreground">
							{mediaHealth === "recovering"
								? "Your session and scenario progress are preserved."
								: "Playback could not continue, but your training context is preserved."}
						</p>
						<div className="flex flex-wrap justify-center gap-3">
							<button
								className="rounded-md bg-primary px-4 py-2 text-xs font-bold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
								onClick={onRetryMedia}
								type="button"
							>
								Try again
							</button>
							<button
								className="rounded-md border border-input px-4 py-2 text-xs font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
								onClick={onRestartSession}
								type="button"
							>
								Restart session
							</button>
						</div>
					</div>
				</div>
			) : null}

			{isOverlayVisible && overlayScenarioData && overlayState ? (
				<div className="absolute inset-0 z-30 p-3 sm:p-6 bg-background/80 backdrop-blur-sm flex items-center justify-center">
					<ScenarioOverlay
						onReplayContext={onReplayContext}
						onResume={onResume}
						onSelectOption={onSelectOption}
						onSkipUnsupportedInput={onSkipUnsupportedInput}
						remainingMs={remainingMs}
						scenario={overlayScenarioData}
						state={overlayState}
						totalMs={totalMs}
					/>
				</div>
			) : null}
		</section>
	);
}

export function SessionPlayerClient({ vod }: SessionPlayerClientProps) {
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
		mediaHealth,
		remainingMs,
		replayContext,
		resumePlayback,
		retrySession,
		retryMedia,
		selectOption,
		skipUnsupportedInput,
		state,
		summary,
		totalMs,
	} = useSessionPlayer({
		initialManifest: vod,
		vodId: vod.id,
	});

	const effectiveDuration = duration > 0 ? duration : vod.durationSeconds;
	const overlayScenarioData = useMemo(
		() => toScenarioOverlayData(currentScenario),
		[currentScenario],
	);
	const isCompleted = state === "COMPLETED" && summary !== null;
	const isOverlayVisible =
		(state === "SCENARIO_ACTIVE" || state === "FEEDBACK") &&
		mediaHealth === "ready" &&
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
				mediaHealth={mediaHealth}
				onReplayContext={replayContext}
				onRestartSession={retrySession}
				onResume={resumePlayback}
				onRetryMedia={retryMedia}
				onSelectOption={selectOption}
				onSkipUnsupportedInput={skipUnsupportedInput}
				overlayScenarioData={overlayScenarioData}
				overlayState={overlayState}
				remainingMs={remainingMs}
				totalMs={totalMs}
			/>

			{!isCompleted && !isOverlayVisible ? (
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
