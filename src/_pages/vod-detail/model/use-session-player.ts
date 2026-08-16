"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	DEFAULT_MODULE_TYPES,
	filterScenariosByModules,
	parseModuleTypes,
} from "@/entities/scenario";
import type { getSessionManifest, ModuleType } from "@/shared/db";
import {
	PlaybackStatus,
	useVodPlayer,
	type VodContainerRef,
} from "@/shared/media";
import { useRecordAttemptMutation } from "../api/use-record-attempt";
import type { ScenarioOverlayState } from "../ui/scenario-overlay";
import {
	calculateSessionSummary,
	type SessionAttempt,
	type SessionSummaryReport,
} from "./summary";

export type SessionPlayerState =
	| "LOADING"
	| "PLAYING"
	| "PAUSED_USER"
	| "SCENARIO_ACTIVE"
	| "FEEDBACK"
	| "COMPLETED";

export type ManifestVod = NonNullable<
	Awaited<ReturnType<typeof getSessionManifest>>
>;
export type ScenarioItem = ManifestVod["scenarios"][number];

export interface UseSessionPlayerOptions {
	activeModuleKeys?: readonly ModuleType[] | readonly string[] | null;
	autoplay?: boolean;
	initialManifest?: ManifestVod | null;
	onSessionComplete?: (summary: SessionSummaryReport) => void;
	vodId: string;
}

export interface UseSessionPlayerResult {
	activeScenarioIndex: number;
	activeScenarios: ScenarioItem[];
	attempts: SessionAttempt[];
	containerRef: VodContainerRef;
	currentScenario: ScenarioItem | null;
	currentTime: number;
	duration: number;
	exitSession: () => void;
	isReady: boolean;
	overlayState: ScenarioOverlayState | null;
	pause: () => void;
	play: () => void;
	playbackStatus: PlaybackStatus;
	remainingMs?: number;
	replayContext: () => void;
	resumePlayback: () => void;
	retrySession: () => void;
	selectOption: (optionId: string) => void;
	state: SessionPlayerState;
	summary: SessionSummaryReport | null;
	totalMs?: number;
	vod: ManifestVod | null;
}

export interface ScenarioOptionItem {
	id: string;
	is_correct?: boolean;
	label?: string;
	text: string;
}

export function getScenarioOptions(inputConfig: unknown): ScenarioOptionItem[] {
	if (
		typeof inputConfig === "object" &&
		inputConfig !== null &&
		"options" in inputConfig &&
		Array.isArray((inputConfig as { options: unknown }).options)
	) {
		return (inputConfig as { options: ScenarioOptionItem[] }).options;
	}
	return [];
}

export function findCorrectOptionId(options: ScenarioOptionItem[]): string {
	for (const option of options) {
		if (option.is_correct) return option.id;
	}
	return "";
}

export function isSelectedOptionCorrect(
	options: ScenarioOptionItem[],
	optionId: string,
): boolean {
	for (const option of options) {
		if (option.id === optionId) return Boolean(option.is_correct);
	}
	return false;
}

export function resolveNewStatusState(
	current: SessionPlayerState,
	newStatus: PlaybackStatus,
): SessionPlayerState | null {
	if (
		newStatus === PlaybackStatus.PLAYING &&
		(current === "LOADING" || current === "PAUSED_USER")
	) {
		return "PLAYING";
	}
	if (newStatus === PlaybackStatus.PAUSED && current === "PLAYING") {
		return "PAUSED_USER";
	}
	if (newStatus === PlaybackStatus.ENDED) {
		return "COMPLETED";
	}
	return null;
}

function useActiveScenarios(
	vod: ManifestVod | null,
	activeModuleKeys?: readonly ModuleType[] | readonly string[] | null,
): ScenarioItem[] {
	const targetModules = useMemo(() => {
		const parsed = parseModuleTypes(activeModuleKeys as string[] | undefined);
		return parsed.length > 0 ? parsed : DEFAULT_MODULE_TYPES;
	}, [activeModuleKeys]);

	return useMemo(() => {
		if (!vod?.scenarios) return [];
		const filtered = filterScenariosByModules(vod.scenarios, targetModules);
		return [...filtered].sort(
			(a, b) => a.timestampSeconds - b.timestampSeconds,
		);
	}, [vod, targetModules]);
}

function useScenarioCountdown(
	state: SessionPlayerState,
	totalMs: number | undefined,
	isUnanswered: boolean,
	onTimeout: () => void,
) {
	const [remainingMs, setRemainingMs] = useState<number | undefined>(undefined);
	const onTimeoutRef = useRef(onTimeout);
	const hasFiredRef = useRef(false);
	const remainingRef = useRef<number>(0);
	onTimeoutRef.current = onTimeout;

	useEffect(() => {
		if (
			state !== "SCENARIO_ACTIVE" ||
			typeof totalMs !== "number" ||
			totalMs <= 0 ||
			!isUnanswered
		) {
			setRemainingMs(undefined);
			hasFiredRef.current = false;
			return;
		}

		hasFiredRef.current = false;
		remainingRef.current = totalMs;
		setRemainingMs(totalMs);
		const interval = setInterval(() => {
			remainingRef.current = Math.max(0, remainingRef.current - 50);
			setRemainingMs(remainingRef.current);
			if (remainingRef.current <= 0 && !hasFiredRef.current) {
				hasFiredRef.current = true;
				clearInterval(interval);
				onTimeoutRef.current();
			}
		}, 50);

		return () => {
			clearInterval(interval);
			hasFiredRef.current = false;
		};
	}, [state, totalMs, isUnanswered]);

	return remainingMs;
}

function getScenarioLimitMs(scenario: ScenarioItem): number | undefined {
	const limitSec =
		scenario.timeLimitSeconds ?? (scenario.moduleType === "TACTICS" ? 3 : null);
	return limitSec && limitSec > 0 ? limitSec * 1000 : undefined;
}

function useScenarioAttemptManager(
	state: SessionPlayerState,
	setState: (s: SessionPlayerState) => void,
	currentScenarioRef: React.RefObject<ScenarioItem | null>,
	totalMs: number | undefined,
	startTimeRef: React.RefObject<number>,
) {
	const [attempts, setAttempts] = useState<SessionAttempt[]>([]);
	const [overlayState, setOverlayState] = useState<ScenarioOverlayState | null>(
		null,
	);
	const recordMutation = useRecordAttemptMutation();

	const handleTimeout = useCallback(() => {
		const scenario = currentScenarioRef.current as ScenarioItem;
		const options = getScenarioOptions(scenario.inputConfig);
		const correctOptionId = findCorrectOptionId(options);
		const responseTimeMs = totalMs as number;
		setOverlayState({ correctOptionId, isCorrect: false, status: "timedOut" });
		setAttempts((prev) => [
			...prev,
			{
				isCorrect: false,
				isTimedOut: true,
				moduleType: scenario.moduleType,
				responseTimeMs,
				scenarioId: scenario.id,
			},
		]);
		recordMutation.mutate({
			isCorrect: false,
			responseTimeMs,
			scenarioId: scenario.id,
		});
		setState("FEEDBACK");
	}, [totalMs, currentScenarioRef, recordMutation, setState]);

	const selectOption = useCallback(
		(optionId: string) => {
			const scenario = currentScenarioRef.current;
			if (
				state !== "SCENARIO_ACTIVE" ||
				overlayState?.status !== "unanswered" ||
				!scenario
			) {
				return;
			}
			const options = getScenarioOptions(scenario.inputConfig);
			const isCorrect = isSelectedOptionCorrect(options, optionId);
			const correctOptionId = findCorrectOptionId(options);
			let elapsedMs = Date.now() - startTimeRef.current;
			if (typeof totalMs === "number" && totalMs > 0) {
				elapsedMs = Math.min(totalMs, elapsedMs);
			}
			const responseTimeMs = Math.round(elapsedMs);
			setOverlayState({
				correctOptionId,
				isCorrect,
				selectedOptionId: optionId,
				status: "answered",
			});
			setAttempts((prev) => [
				...prev,
				{
					isCorrect,
					moduleType: scenario.moduleType,
					responseTimeMs,
					scenarioId: scenario.id,
				},
			]);
			recordMutation.mutate({
				isCorrect,
				responseTimeMs,
				scenarioId: scenario.id,
				selectedOptionId: optionId,
			});
			setState("FEEDBACK");
		},
		[
			state,
			overlayState?.status,
			currentScenarioRef,
			totalMs,
			startTimeRef,
			recordMutation,
			setState,
		],
	);

	return {
		attempts,
		handleTimeout,
		overlayState,
		selectOption,
		setAttempts,
		setOverlayState,
	};
}

interface ActionCallbacksParams {
	currentScenario: ScenarioItem | null;
	setActiveScenarioIndex: React.Dispatch<React.SetStateAction<number>>;
	setAttempts: React.Dispatch<React.SetStateAction<SessionAttempt[]>>;
	setOverlayState: React.Dispatch<
		React.SetStateAction<ScenarioOverlayState | null>
	>;
	setState: (s: SessionPlayerState) => void;
	setTotalMs: React.Dispatch<React.SetStateAction<number | undefined>>;
	state: SessionPlayerState;
	vodId: string;
	vodPlayer: ReturnType<typeof useVodPlayer>;
}

function useSessionActionCallbacks({
	currentScenario,
	setActiveScenarioIndex,
	setAttempts,
	setOverlayState,
	setState,
	setTotalMs,
	state,
	vodId,
	vodPlayer,
}: ActionCallbacksParams) {
	const pause = useCallback(() => {
		vodPlayer.pause();
		setState("PAUSED_USER");
	}, [vodPlayer, setState]);

	const play = useCallback(() => {
		vodPlayer.play();
		setState("PLAYING");
	}, [vodPlayer, setState]);

	const replayContext = useCallback(() => {
		if (state !== "SCENARIO_ACTIVE" || !currentScenario) return;
		vodPlayer.seekTo(Math.max(0, currentScenario.timestampSeconds - 10), true);
		vodPlayer.play();
		setOverlayState(null);
		setTotalMs(undefined);
		setState("PLAYING");
	}, [
		state,
		currentScenario,
		vodPlayer,
		setOverlayState,
		setTotalMs,
		setState,
	]);

	const resumePlayback = useCallback(() => {
		if (state !== "FEEDBACK") return;
		setActiveScenarioIndex((idx) => idx + 1);
		setOverlayState(null);
		setTotalMs(undefined);
		vodPlayer.play();
		setState("PLAYING");
	}, [
		state,
		vodPlayer,
		setActiveScenarioIndex,
		setOverlayState,
		setTotalMs,
		setState,
	]);

	const retrySession = useCallback(() => {
		setAttempts([]);
		setActiveScenarioIndex(0);
		setOverlayState(null);
		setTotalMs(undefined);
		vodPlayer.seekTo(0, true);
		vodPlayer.play();
		setState("PLAYING");
	}, [
		vodPlayer,
		setAttempts,
		setActiveScenarioIndex,
		setOverlayState,
		setTotalMs,
		setState,
	]);

	const exitSession = useCallback(() => {
		window.location.href = `/vods/${vodId}`;
	}, [vodId]);

	return {
		exitSession,
		pause,
		play,
		replayContext,
		resumePlayback,
		retrySession,
	};
}

function useSessionPlaybackAdapter(
	autoplay: boolean,
	vod: ManifestVod | null,
	stateRef: React.RefObject<SessionPlayerState>,
	setState: (s: SessionPlayerState) => void,
	onTimeUpdate: (time: number) => void,
) {
	const onReady = useCallback(() => {
		setState(autoplay ? "PLAYING" : "PAUSED_USER");
	}, [autoplay, setState]);

	const onStatusChange = useCallback(
		(s: PlaybackStatus) => {
			const next = resolveNewStatusState(stateRef.current, s);
			if (next) setState(next);
		},
		[stateRef, setState],
	);

	return useVodPlayer({
		autoplay,
		onReady,
		onStatusChange,
		onTimeUpdate,
		videoId: vod?.youtubeVideoId ?? "",
	});
}

function useSessionSummaryTracker(
	state: SessionPlayerState,
	attempts: SessionAttempt[],
	onSessionComplete?: (summary: SessionSummaryReport) => void,
) {
	const summary = useMemo(() => {
		return state === "COMPLETED" ? calculateSessionSummary(attempts) : null;
	}, [state, attempts]);

	useEffect(() => {
		if (state === "COMPLETED" && summary) onSessionComplete?.(summary);
	}, [state, summary, onSessionComplete]);

	return summary;
}

function useScenarioTimeTrigger(
	stateRef: React.RefObject<SessionPlayerState>,
	currentScenarioRef: React.RefObject<ScenarioItem | null>,
	setState: (s: SessionPlayerState) => void,
	setOverlayState: React.Dispatch<
		React.SetStateAction<ScenarioOverlayState | null>
	>,
	startTimeRef: React.RefObject<number>,
	setTotalMs: React.Dispatch<React.SetStateAction<number | undefined>>,
	pauseRef: React.RefObject<() => void>,
) {
	return useCallback(
		(time: number) => {
			if (stateRef.current !== "PLAYING") return;
			const scenario = currentScenarioRef.current;
			if (!scenario || time < scenario.timestampSeconds) return;
			setState("SCENARIO_ACTIVE");
			setOverlayState({ status: "unanswered" });
			startTimeRef.current = Date.now();
			setTotalMs(getScenarioLimitMs(scenario));
			pauseRef.current();
		},
		[
			stateRef,
			currentScenarioRef,
			setState,
			setOverlayState,
			startTimeRef,
			setTotalMs,
			pauseRef,
		],
	);
}

export function useSessionPlayer({
	activeModuleKeys,
	autoplay = true,
	initialManifest,
	onSessionComplete,
	vodId,
}: UseSessionPlayerOptions): UseSessionPlayerResult {
	const vod = initialManifest ?? null;
	const activeScenarios = useActiveScenarios(vod, activeModuleKeys);
	const [state, setState] = useState<SessionPlayerState>("LOADING");
	const [activeScenarioIndex, setActiveScenarioIndex] = useState<number>(0);
	const [totalMs, setTotalMs] = useState<number | undefined>(undefined);
	const startTimeRef = useRef<number>(0);
	const pauseRef = useRef<() => void>(() => {});
	const stateRef = useRef(state);
	const currentScenario = activeScenarios[activeScenarioIndex] ?? null;
	const currentScenarioRef = useRef(currentScenario);
	stateRef.current = state;
	currentScenarioRef.current = currentScenario;

	const {
		attempts,
		handleTimeout,
		overlayState,
		selectOption,
		setAttempts,
		setOverlayState,
	} = useScenarioAttemptManager(
		state,
		setState,
		currentScenarioRef,
		totalMs,
		startTimeRef,
	);

	const remainingMs = useScenarioCountdown(
		state,
		totalMs,
		overlayState?.status === "unanswered",
		handleTimeout,
	);

	const onTimeUpdate = useScenarioTimeTrigger(
		stateRef,
		currentScenarioRef,
		setState,
		setOverlayState,
		startTimeRef,
		setTotalMs,
		pauseRef,
	);

	const vodPlayer = useSessionPlaybackAdapter(
		autoplay,
		vod,
		stateRef,
		setState,
		onTimeUpdate,
	);
	pauseRef.current = vodPlayer.pause;

	const actions = useSessionActionCallbacks({
		currentScenario,
		setActiveScenarioIndex,
		setAttempts,
		setOverlayState,
		setState,
		setTotalMs,
		state,
		vodId,
		vodPlayer,
	});

	const summary = useSessionSummaryTracker(state, attempts, onSessionComplete);

	return {
		activeScenarioIndex,
		activeScenarios,
		attempts,
		containerRef: vodPlayer.containerRef,
		currentScenario,
		currentTime: vodPlayer.currentTime,
		duration: vodPlayer.duration,
		isReady: vodPlayer.isReady,
		overlayState,
		playbackStatus: vodPlayer.status,
		remainingMs,
		selectOption,
		state,
		summary,
		totalMs,
		vod,
		...actions,
	};
}
