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
import {
	initialSessionPlayerSession,
	type SessionPlayerAction,
	type SessionPlayerState,
	sessionPlayerReducer,
} from "./session-player-state";
import {
	calculateSessionSummary,
	type SessionAttempt,
	type SessionSummaryReport,
} from "./summary";

export type {
	ScenarioData,
	ScenarioOverlayState,
} from "./session-contract";
export {
	normalizeScenario,
	toScenarioOverlayData,
} from "./session-contract";
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

interface SessionAttemptCallbacksParams {
	currentScenarioRef: React.RefObject<ScenarioItem | null>;
	dispatch: React.Dispatch<SessionPlayerAction>;
	overlayState: ScenarioOverlayState | null;
	startTimeRef: React.RefObject<number>;
	state: SessionPlayerState;
	totalMs: number | undefined;
}

function useSessionAttemptCallbacks({
	currentScenarioRef,
	dispatch,
	overlayState,
	startTimeRef,
	state,
	totalMs,
}: SessionAttemptCallbacksParams) {
	const recordMutation = useRecordAttemptMutation();

	const handleTimeout = useCallback(() => {
		const scenario = currentScenarioRef.current;
		if (
			state !== "SCENARIO_ACTIVE" ||
			overlayState?.status !== "unanswered" ||
			!scenario ||
			typeof totalMs !== "number"
		) {
			return;
		}

		const { correctOptionId } = scenario.input;
		const attempt: SessionAttempt = {
			isCorrect: false,
			isTimedOut: true,
			moduleType: scenario.moduleType,
			responseTimeMs: totalMs,
			scenarioId: scenario.id,
		};
		dispatch({
			attempt,
			overlayState: { correctOptionId, isCorrect: false, status: "timedOut" },
			type: "TIMEOUT_RECORDED",
		});
		recordMutation.mutate({
			isCorrect: false,
			responseTimeMs: totalMs,
			scenarioId: scenario.id,
		});
	}, [
		currentScenarioRef,
		dispatch,
		overlayState?.status,
		recordMutation,
		state,
		totalMs,
	]);

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

			const { correctOptionId } = scenario.input;
			const isCorrect = scenario.input.evaluateAnswer(optionId);
			let elapsedMs = Date.now() - startTimeRef.current;
			if (typeof totalMs === "number" && totalMs > 0) {
				elapsedMs = Math.min(totalMs, elapsedMs);
			}
			const responseTimeMs = Math.round(elapsedMs);
			const attempt: SessionAttempt = {
				isCorrect,
				moduleType: scenario.moduleType,
				responseTimeMs,
				scenarioId: scenario.id,
			};
			dispatch({
				attempt,
				overlayState: {
					correctOptionId,
					isCorrect,
					selectedOptionId: optionId,
					status: "answered",
				},
				type: "ANSWER_RECORDED",
			});
			recordMutation.mutate({
				isCorrect,
				responseTimeMs,
				scenarioId: scenario.id,
				selectedOptionId: optionId,
			});
		},
		[
			currentScenarioRef,
			dispatch,
			overlayState?.status,
			recordMutation,
			startTimeRef,
			state,
			totalMs,
		],
	);

	return { handleTimeout, selectOption };
}

interface SessionActionCallbacksParams {
	currentScenario: ScenarioItem | null;
	dispatch: React.Dispatch<SessionPlayerAction>;
	state: SessionPlayerState;
	vodId: string;
	vodPlayer: ReturnType<typeof useVodPlayer>;
}

function useSessionActionCallbacks({
	currentScenario,
	dispatch,
	state,
	vodId,
	vodPlayer,
}: SessionActionCallbacksParams) {
	const pause = useCallback(() => {
		if (state !== "PLAYING") return;
		dispatch({ type: "PAUSE_REQUESTED" });
		vodPlayer.pause();
	}, [dispatch, state, vodPlayer]);

	const play = useCallback(() => {
		if (state !== "PAUSED_USER") return;
		dispatch({ type: "PLAY_REQUESTED" });
		vodPlayer.play();
	}, [dispatch, state, vodPlayer]);

	const replayContext = useCallback(() => {
		if (state !== "SCENARIO_ACTIVE" || !currentScenario) return;
		dispatch({ type: "REPLAY_CONTEXT" });
		vodPlayer.seekTo(Math.max(0, currentScenario.timestampSeconds - 10), true);
		vodPlayer.play();
	}, [currentScenario, dispatch, state, vodPlayer]);

	const resumePlayback = useCallback(() => {
		if (state !== "FEEDBACK") return;
		dispatch({ type: "RESUME_PLAYBACK" });
		vodPlayer.play();
	}, [dispatch, state, vodPlayer]);

	const skipUnsupportedInput = useCallback(() => {
		if (
			state === "SCENARIO_ACTIVE" &&
			currentScenario?.input.kind === "unsupported"
		) {
			dispatch({ type: "UNSUPPORTED_INPUT_SKIPPED" });
			vodPlayer.play();
		}
	}, [currentScenario?.input.kind, dispatch, state, vodPlayer]);

	const retrySession = useCallback(() => {
		dispatch({ type: "RETRY_SESSION" });
		vodPlayer.seekTo(0, true);
		vodPlayer.play();
	}, [dispatch, vodPlayer]);

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
		skipUnsupportedInput,
	};
}

function useSessionPlaybackAdapter(
	autoplay: boolean,
	vod: ManifestVod | null,
	dispatch: React.Dispatch<SessionPlayerAction>,
	onTimeUpdate: (time: number) => void,
) {
	const onReady = useCallback(() => {
		dispatch({ autoplay, type: "PLAYER_READY" });
	}, [autoplay, dispatch]);

	const onStatusChange = useCallback(
		(status: PlaybackStatus) => {
			dispatch({ status, type: "PLAYBACK_STATUS_CHANGED" });
		},
		[dispatch],
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
	onScenarioTriggered: (scenario: ScenarioItem) => void,
	pauseRef: React.RefObject<(() => void) | null>,
) {
	return useCallback(
		(time: number) => {
			if (stateRef.current !== "PLAYING") return;
			const scenario = currentScenarioRef.current;
			if (!scenario || time < scenario.timestampSeconds) return;
			onScenarioTriggered(scenario);
			pauseRef.current?.();
		},
		[stateRef, currentScenarioRef, onScenarioTriggered, pauseRef],
	);
}

export function useSessionPlayer({
	autoplay = true,
	initialManifest,
	onSessionComplete,
	vodId,
}: UseSessionPlayerOptions): UseSessionPlayerResult {
	const vod = initialManifest ?? null;
	const activeScenarios = useSessionScenarios(vod);
	const [session, dispatch] = useReducer(
		sessionPlayerReducer,
		initialSessionPlayerSession,
	);
	const startTimeRef = useRef<number>(0);
	const pauseRef = useRef<(() => void) | null>(null);
	const stateRef = useRef(session.state);
	const currentScenario = activeScenarios[session.activeScenarioIndex] ?? null;
	const currentScenarioRef = useRef(currentScenario);
	stateRef.current = session.state;
	currentScenarioRef.current = currentScenario;

	const onScenarioTriggered = useCallback((scenario: ScenarioItem) => {
		startTimeRef.current = Date.now();
		dispatch({
			totalMs: getScenarioLimitMs(scenario),
			type: "SCENARIO_TRIGGERED",
		});
	}, []);

	const { handleTimeout, selectOption } = useSessionAttemptCallbacks({
		currentScenarioRef,
		dispatch,
		overlayState: session.overlayState,
		startTimeRef,
		state: session.state,
		totalMs: session.totalMs,
	});

	const remainingMs = useScenarioCountdown(
		session.state,
		session.totalMs,
		session.overlayState?.status === "unanswered",
		handleTimeout,
	);

	const onTimeUpdate = useScenarioTimeTrigger(
		stateRef,
		currentScenarioRef,
		onScenarioTriggered,
		pauseRef,
	);

	const vodPlayer = useSessionPlaybackAdapter(
		autoplay,
		vod,
		dispatch,
		onTimeUpdate,
	);
	pauseRef.current = vodPlayer.pause;

	const actions = useSessionActionCallbacks({
		currentScenario,
		dispatch,
		state: session.state,
		vodId,
		vodPlayer,
	});

	const summary = useSessionSummaryTracker(
		session.state,
		session.attempts,
		onSessionComplete,
	);

	return {
		activeScenarioIndex: session.activeScenarioIndex,
		activeScenarios,
		attempts: session.attempts,
		containerRef: vodPlayer.containerRef,
		currentScenario,
		currentTime: vodPlayer.currentTime,
		duration: vodPlayer.duration,
		isReady: vodPlayer.isReady,
		overlayState: session.overlayState,
		playbackStatus: vodPlayer.status,
		remainingMs,
		selectOption,
		state: session.state,
		summary,
		totalMs: session.totalMs,
		vod,
		...actions,
	};
}
