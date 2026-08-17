"use client";

import {
	useCallback,
	useEffect,
	useMemo,
	useReducer,
	useRef,
	useState,
} from "react";
import type { getSessionManifest } from "@/shared/db";
import {
	type PlaybackStatus,
	useVodPlayer,
	type VodContainerRef,
} from "@/shared/media";
import { useRecordAttemptMutation } from "../api/use-record-attempt";
import {
	type NormalizedScenario,
	normalizeScenario,
	type ScenarioOption,
	type ScenarioOverlayState,
} from "./session-contract";
import type { SessionPlayerState } from "./session-player-state";
import {
	createSessionPlaythroughState,
	getScenarioLimitMs,
	type SessionPlaythroughAction,
	type SessionPlaythroughEffect,
	type SessionPlaythroughState,
	type SessionScenario,
	sessionPlaythroughReducer,
} from "./session-playthrough-coordinator";
import {
	calculateSessionSummary,
	type SessionAttempt,
	type SessionSummaryReport,
} from "./summary";

export type { ScenarioData, ScenarioOverlayState } from "./session-contract";
export { normalizeScenario, toScenarioOverlayData } from "./session-contract";
export type { SessionPlayerState } from "./session-player-state";
export { resolveNewStatusState } from "./session-player-state";

export type ManifestVod = NonNullable<
	Awaited<ReturnType<typeof getSessionManifest>>
>;
export type ScenarioItem = NormalizedScenario<ManifestVod["scenarios"][number]>;

export interface UseSessionPlayerOptions {
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
	skipUnsupportedInput: () => void;
	state: SessionPlayerState;
	summary: SessionSummaryReport | null;
	totalMs?: number;
	vod: ManifestVod | null;
}

export type ScenarioOptionItem = ScenarioOption;

function useSessionScenarios(vod: ManifestVod | null): ScenarioItem[] {
	return useMemo(() => {
		if (!vod?.scenarios) return [];
		return [...vod.scenarios]
			.map(normalizeScenario)
			.sort((a, b) => a.timestampSeconds - b.timestampSeconds);
	}, [vod]);
}

function useScenarioCountdown(
	deadlineAtMs: number | undefined,
	isUnanswered: boolean,
	onTimeout: (deadlineAtMs: number) => void,
) {
	const [remainingMs, setRemainingMs] = useState<number | undefined>(undefined);
	const onTimeoutRef = useRef(onTimeout);
	onTimeoutRef.current = onTimeout;

	useEffect(() => {
		if (!isUnanswered || deadlineAtMs === undefined) {
			setRemainingMs(undefined);
			return;
		}

		let hasFired = false;
		const update = () => {
			const remaining = Math.max(0, deadlineAtMs - Date.now());
			setRemainingMs(remaining);
			if (remaining === 0 && !hasFired) {
				hasFired = true;
				onTimeoutRef.current(deadlineAtMs);
			}
		};

		update();
		const interval = setInterval(update, 50);
		return () => clearInterval(interval);
	}, [deadlineAtMs, isUnanswered]);

	return remainingMs;
}

function useSessionPlaybackAdapter(
	autoplay: boolean,
	vod: ManifestVod | null,
	dispatch: React.Dispatch<SessionPlaythroughAction>,
	generationRef: React.RefObject<number>,
	onTimeUpdate: (time: number) => void,
) {
	const onReady = useCallback(() => {
		dispatch({
			autoplay,
			generation: generationRef.current,
			type: "PLAYER_READY",
		});
	}, [autoplay, dispatch, generationRef]);

	const onStatusChange = useCallback(
		(status: PlaybackStatus) => {
			dispatch({
				generation: generationRef.current,
				status,
				type: "PLAYBACK_STATUS_CHANGED",
			});
		},
		[dispatch, generationRef],
	);

	return useVodPlayer({
		autoplay,
		onReady,
		onStatusChange,
		onTimeUpdate,
		videoId: vod?.youtubeVideoId ?? "",
	});
}

function executeSessionEffect(
	effect: SessionPlaythroughEffect,
	vodPlayer: ReturnType<typeof useVodPlayer>,
	recordAttempt: ReturnType<typeof useRecordAttemptMutation>,
	onSessionCompleteRef: React.RefObject<
		((summary: SessionSummaryReport) => void) | undefined
	>,
) {
	switch (effect.type) {
		case "MEDIA_PAUSE":
			vodPlayer.pause();
			return;
		case "MEDIA_PLAY":
			vodPlayer.play();
			return;
		case "MEDIA_REPLAY_CONTEXT":
			vodPlayer.seekTo(Math.max(0, effect.timestampSeconds - 10), true);
			vodPlayer.play();
			return;
		case "MEDIA_RESTART":
			vodPlayer.seekTo(0, true);
			if (effect.autoplay) vodPlayer.play();
			return;
		case "RECORD_ATTEMPT":
			recordAttempt.mutate({
				idempotencyKey: effect.outcome.idempotencyKey,
				isCorrect: effect.outcome.attempt.isCorrect,
				responseTimeMs: effect.outcome.attempt.responseTimeMs,
				scenarioId: effect.outcome.attempt.scenarioId,
				...(effect.outcome.kind === "answered"
					? { selectedOptionId: effect.outcome.selectedOptionId }
					: {}),
			});
			return;
		case "SESSION_COMPLETED":
			onSessionCompleteRef.current?.(effect.summary);
	}
}

function useSessionEffects(
	effects: readonly SessionPlaythroughEffect[],
	dispatch: React.Dispatch<SessionPlaythroughAction>,
	vodPlayer: ReturnType<typeof useVodPlayer>,
	recordAttempt: ReturnType<typeof useRecordAttemptMutation>,
	onSessionCompleteRef: React.RefObject<
		((summary: SessionSummaryReport) => void) | undefined
	>,
) {
	useEffect(() => {
		if (effects.length === 0) return;

		effects.forEach((effect) => {
			executeSessionEffect(
				effect,
				vodPlayer,
				recordAttempt,
				onSessionCompleteRef,
			);
		});

		dispatch({ type: "EFFECTS_CONSUMED" });
	}, [dispatch, effects, onSessionCompleteRef, recordAttempt, vodPlayer]);
}

function getManifestKey(vod: ManifestVod | null): string {
	if (!vod) return "empty";
	return JSON.stringify(vod);
}

function useSessionPlayerActions(
	dispatch: React.Dispatch<SessionPlaythroughAction>,
	coordinatorRef: React.RefObject<SessionPlaythroughState>,
	vodId: string,
) {
	const pause = useCallback(() => {
		dispatch({
			generation: coordinatorRef.current.generation,
			type: "PAUSE_REQUESTED",
		});
	}, [coordinatorRef, dispatch]);

	const play = useCallback(() => {
		dispatch({
			generation: coordinatorRef.current.generation,
			type: "PLAY_REQUESTED",
		});
	}, [coordinatorRef, dispatch]);

	const replayContext = useCallback(() => {
		dispatch({
			generation: coordinatorRef.current.generation,
			type: "REPLAY_CONTEXT",
		});
	}, [coordinatorRef, dispatch]);

	const resumePlayback = useCallback(() => {
		dispatch({
			generation: coordinatorRef.current.generation,
			type: "RESUME_PLAYBACK",
		});
	}, [coordinatorRef, dispatch]);

	const retrySession = useCallback(() => {
		dispatch({ autoplay: true, type: "RETRY_SESSION" });
	}, [dispatch]);

	const selectOption = useCallback(
		(optionId: string) => {
			const state = coordinatorRef.current;
			const scenario = state.scenarios[state.session.activeScenarioIndex];
			if (!scenario) return;
			dispatch({
				generation: state.generation,
				idempotencyKey: crypto.randomUUID(),
				nowMs: Date.now(),
				optionId,
				scenarioId: scenario.id,
				type: "OPTION_SELECTED",
			});
		},
		[coordinatorRef, dispatch],
	);

	const skipUnsupportedInput = useCallback(() => {
		dispatch({
			generation: coordinatorRef.current.generation,
			type: "UNSUPPORTED_INPUT_SKIPPED",
		});
	}, [coordinatorRef, dispatch]);

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
		selectOption,
		skipUnsupportedInput,
	};
}

interface SessionPlayerRuntimeOptions {
	activeScenarios: ScenarioItem[];
	autoplay: boolean;
	onSessionComplete?: (summary: SessionSummaryReport) => void;
	vod: ManifestVod | null;
}

function useSessionPlayerRuntime({
	activeScenarios,
	autoplay,
	onSessionComplete,
	vod,
}: SessionPlayerRuntimeOptions) {
	const coordinatorScenarios = activeScenarios as readonly SessionScenario[];
	const [coordinator, dispatch] = useReducer(
		sessionPlaythroughReducer,
		coordinatorScenarios,
		createSessionPlaythroughState,
	);
	const coordinatorRef = useRef<SessionPlaythroughState>(coordinator);
	coordinatorRef.current = coordinator;
	const generationRef = useRef(coordinator.generation);
	generationRef.current = coordinator.generation;
	const onSessionCompleteRef = useRef(onSessionComplete);
	onSessionCompleteRef.current = onSessionComplete;
	const currentScenario =
		(activeScenarios[
			coordinator.session.activeScenarioIndex
		] as ScenarioItem) ?? null;
	const onTimeUpdate = useCallback((time: number) => {
		if (coordinatorRef.current.session.state !== "PLAYING") return;
		dispatch({
			generation: generationRef.current,
			nowMs: Date.now(),
			time,
			type: "TIME_UPDATED",
		});
	}, []);
	const vodPlayer = useSessionPlaybackAdapter(
		autoplay,
		vod,
		dispatch,
		generationRef,
		onTimeUpdate,
	);
	const recordAttempt = useRecordAttemptMutation();
	const manifestKey = getManifestKey(vod);
	const previousManifestKeyRef = useRef(manifestKey);
	useEffect(() => {
		if (previousManifestKeyRef.current === manifestKey) return;
		previousManifestKeyRef.current = manifestKey;
		dispatch({
			autoplay,
			scenarios: coordinatorScenarios,
			type: "MANIFEST_CHANGED",
		});
	}, [autoplay, coordinatorScenarios, manifestKey]);
	const onTimeout = useCallback((deadlineAtMs: number) => {
		const state = coordinatorRef.current;
		const scenario = state.scenarios[state.session.activeScenarioIndex];
		// c8 ignore next -- a deadline is only created with an active Scenario.
		if (!scenario) return;
		dispatch({
			deadlineAtMs,
			generation: state.generation,
			idempotencyKey: crypto.randomUUID(),
			nowMs: Date.now(),
			scenarioId: scenario.id,
			type: "TIMEOUT_REQUESTED",
		});
	}, []);
	const remainingMs = useScenarioCountdown(
		coordinator.deadlineAtMs,
		coordinator.session.overlayState?.status === "unanswered",
		onTimeout,
	);
	useSessionEffects(
		coordinator.effects,
		dispatch,
		vodPlayer,
		recordAttempt,
		onSessionCompleteRef,
	);
	return {
		coordinator,
		coordinatorRef,
		currentScenario,
		dispatch,
		remainingMs,
		vodPlayer,
	};
}

export function useSessionPlayer({
	autoplay = true,
	initialManifest,
	onSessionComplete,
	vodId,
}: UseSessionPlayerOptions): UseSessionPlayerResult {
	const vod = initialManifest ?? null;
	const activeScenarios = useSessionScenarios(vod);
	const runtime = useSessionPlayerRuntime({
		activeScenarios,
		autoplay,
		onSessionComplete,
		vod,
	});
	const {
		coordinator,
		coordinatorRef,
		currentScenario,
		remainingMs,
		vodPlayer,
	} = runtime;
	const actions = useSessionPlayerActions(
		runtime.dispatch,
		coordinatorRef,
		vodId,
	);

	const summary = useMemo(
		() =>
			coordinator.session.state === "COMPLETED"
				? calculateSessionSummary(coordinator.session.attempts)
				: null,
		[coordinator.session.attempts, coordinator.session.state],
	);

	return {
		activeScenarioIndex: coordinator.session.activeScenarioIndex,
		activeScenarios,
		attempts: coordinator.session.attempts,
		containerRef: vodPlayer.containerRef,
		currentScenario,
		currentTime: vodPlayer.currentTime,
		duration: vodPlayer.duration,
		...actions,
		isReady: vodPlayer.isReady,
		overlayState: coordinator.session.overlayState,
		playbackStatus: vodPlayer.status,
		remainingMs,
		state: coordinator.session.state,
		summary,
		totalMs: coordinator.session.totalMs,
		vod,
	};
}

export { getScenarioLimitMs };
