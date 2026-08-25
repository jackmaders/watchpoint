"use client";

import {
	useCallback,
	useEffect,
	useMemo,
	useReducer,
	useRef,
	useState,
} from "react";
import type { SessionManifest } from "@/shared/db";
import {
	type PlaybackStatus,
	type SessionMediaAdapterResult,
	type SessionMediaEvent,
	useSessionMediaAdapter,
	type VodContainerRef,
} from "@/shared/media";
import { useRecordAttemptMutation } from "../api/use-record-attempt";
import type { AttemptOutcome } from "./attempt";
import {
	type NormalizedScenario,
	normalizeScenario,
	type ScenarioOption,
	type ScenarioOverlayState,
} from "./session-contract";
import {
	createSessionPlaythroughState,
	getScenarioLimitMs,
	type SessionPlayerState,
	type SessionPlaythroughAction,
	type SessionPlaythroughEffect,
	type SessionPlaythroughState,
	type SessionScenario,
	sessionPlaythroughReducer,
} from "./session-playthrough-coordinator";
import type { SessionSummaryReport } from "./summary";

export type { ScenarioData, ScenarioOverlayState } from "./session-contract";
export { normalizeScenario, toScenarioOverlayData } from "./session-contract";
export type { SessionPlayerState } from "./session-playthrough-coordinator";
export { resolveNewStatusState } from "./session-playthrough-coordinator";

export type ManifestVod = SessionManifest;
export type ScenarioItem = NormalizedScenario<ManifestVod["scenarios"][number]>;

export interface UseSessionPlayerOptions {
	autoplay?: boolean;
	initialManifest?: ManifestVod | null;
	onSessionComplete?: (summary: SessionSummaryReport) => void;
	onMediaDiagnostics?: (
		diagnostic: import("@/shared/media").MediaDiagnostic,
	) => void;
	vodId: string;
	playthroughId?: string | null;
	scenarioSnapshotIds?: readonly string[];
}

export interface UseSessionPlayerResult {
	activeScenarioIndex: number;
	activeScenarios: ScenarioItem[];
	attempts: AttemptOutcome[];
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
	mediaHealth: "loading" | "ready" | "buffering" | "recovering" | "failed";
	remainingMs?: number;
	replayContext: () => void;
	resumePlayback: () => void;
	retrySession: () => void;
	retryMedia: () => void;
	selectOption: (optionId: string) => void;
	skipUnsupportedInput: () => void;
	state: SessionPlayerState;
	summary: SessionSummaryReport | null;
	totalMs?: number;
	vod: ManifestVod | null;
}

export type ScenarioOptionItem = ScenarioOption;

export function toSessionPlaythroughMediaAction(
	event: SessionMediaEvent,
	autoplay: boolean,
	nowMs = 0,
): SessionPlaythroughAction | null {
	switch (event.type) {
		case "READY":
			return {
				autoplay,
				generation: event.generation as number,
				type: "PLAYER_READY",
			};
		case "PLAYBACK_STATUS_CHANGED":
			return {
				generation: event.generation as number,
				nowMs,
				status: event.status,
				type: "PLAYBACK_STATUS_CHANGED",
			};
		case "MEDIA_FAILURE":
			return {
				failure: event.failure,
				generation: event.generation as number,
				nowMs,
				type: "MEDIA_FAILURE",
			};
		case "RECOVERY_SUCCEEDED":
			return {
				generation: event.generation as number,
				nowMs,
				retryCount: event.retryCount,
				type: "RECOVERY_SUCCEEDED",
			};
		case "TIME_UPDATED":
			return {
				generation: event.generation as number,
				nowMs,
				time: event.time,
				type: "TIME_UPDATED",
			};
	}
}

function useSessionScenarios(
	vod: ManifestVod | null,
	scenarioSnapshotIds: readonly string[] = [],
): ScenarioItem[] {
	return useMemo(() => {
		if (!vod?.scenarios) return [];
		const snapshotIdsByScenarioId = new Map(
			vod.scenarios.map((scenario, index) => [
				scenario.id,
				scenarioSnapshotIds[index],
			]),
		);
		return [...vod.scenarios]
			.map((scenario) => ({
				...normalizeScenario(scenario),
				scenarioSnapshotId: snapshotIdsByScenarioId.get(scenario.id),
			}))
			.sort((a, b) => a.timestampSeconds - b.timestampSeconds);
	}, [vod, scenarioSnapshotIds]);
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

function executeSessionEffect(
	effect: SessionPlaythroughEffect,
	media: SessionMediaAdapterResult,
	recordAttempt: ReturnType<typeof useRecordAttemptMutation>,
	playthroughId: string | null | undefined,
	onSessionCompleteRef: React.RefObject<
		((summary: SessionSummaryReport) => void) | undefined
	>,
) {
	switch (effect.type) {
		case "MEDIA_PAUSE":
			media.execute({ type: "PAUSE" });
			return;
		case "MEDIA_RECOVER":
			media.execute({ autoplay: effect.autoplay, type: "RECOVER" });
			return;
		case "MEDIA_PLAY":
			media.execute({ type: "PLAY" });
			return;
		case "MEDIA_REPLAY_CONTEXT":
			media.execute({
				timestampSeconds: effect.timestampSeconds,
				type: "REPLAY_CONTEXT",
			});
			return;
		case "MEDIA_RESTART":
			media.execute({ autoplay: effect.autoplay, type: "RESTART" });
			return;
		case "RECORD_ATTEMPT":
			recordAttempt.mutate({ ...effect.outcome, playthroughId });
			return;
		case "SESSION_COMPLETED":
			onSessionCompleteRef.current?.(effect.summary);
	}
}

function useSessionEffects(
	effects: readonly SessionPlaythroughEffect[],
	dispatch: React.Dispatch<SessionPlaythroughAction>,
	media: SessionMediaAdapterResult,
	recordAttempt: ReturnType<typeof useRecordAttemptMutation>,
	onSessionCompleteRef: React.RefObject<
		((summary: SessionSummaryReport) => void) | undefined
	>,
	playthroughId: string | null | undefined,
) {
	useEffect(() => {
		if (effects.length === 0) return;

		effects.forEach((effect) => {
			executeSessionEffect(
				effect,
				media,
				recordAttempt,
				playthroughId,
				onSessionCompleteRef,
			);
		});

		dispatch({ type: "EFFECTS_CONSUMED" });
	}, [
		dispatch,
		effects,
		media,
		onSessionCompleteRef,
		recordAttempt,
		playthroughId,
	]);
}

function useSessionMedia(
	autoplay: boolean,
	generation: number,
	vod: ManifestVod | null,
	coordinatorRef: React.RefObject<SessionPlaythroughState>,
	dispatch: React.Dispatch<SessionPlaythroughAction>,
	onMediaDiagnostics?: (
		diagnostic: import("@/shared/media").MediaDiagnostic,
	) => void,
) {
	const onTimeUpdate = useCallback(
		(time: number, eventGeneration?: number) => {
			if (coordinatorRef.current.session.state !== "PLAYING") return;
			dispatch({
				generation: eventGeneration as number,
				nowMs: Date.now(),
				time,
				type: "TIME_UPDATED",
			});
		},
		[coordinatorRef, dispatch],
	);
	const onMediaEvent = useCallback(
		(event: SessionMediaEvent) => {
			const action = toSessionPlaythroughMediaAction(
				event,
				autoplay,
				event.type === "TIME_UPDATED" ? 0 : Date.now(),
			);
			if (action?.type === "TIME_UPDATED") {
				onTimeUpdate(action.time, action.generation);
				return;
			}
			// c8 ignore next -- the semantic media event union is exhaustive.
			if (action) dispatch(action);
		},
		[autoplay, dispatch, onTimeUpdate],
	);

	return useSessionMediaAdapter({
		autoplay,
		generation,
		onDiagnostics: onMediaDiagnostics,
		onEvent: onMediaEvent,
		videoId: vod?.youtubeVideoId ?? "",
	});
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

	const retryMedia = useCallback(() => {
		dispatch({
			generation: coordinatorRef.current.generation,
			nowMs: Date.now(),
			type: "RETRY_MEDIA",
		});
	}, [coordinatorRef, dispatch]);

	const selectOption = useCallback(
		(optionId: string) => {
			const state = coordinatorRef.current;
			const scenario = state.scenarios[state.session.activeScenarioIndex];
			if (!scenario) return;
			dispatch({
				generation: state.generation,
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
		retryMedia,
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
	playthroughId?: string | null;
	onMediaDiagnostics?: (
		diagnostic: import("@/shared/media").MediaDiagnostic,
	) => void;
}

function useSessionPlayerRuntime({
	activeScenarios,
	autoplay,
	onSessionComplete,
	onMediaDiagnostics,
	vod,
	playthroughId,
}: SessionPlayerRuntimeOptions) {
	const coordinatorScenarios = activeScenarios as readonly SessionScenario[];
	const [coordinator, dispatch] = useReducer(
		sessionPlaythroughReducer,
		coordinatorScenarios,
		createSessionPlaythroughState,
	);
	const coordinatorRef = useRef<SessionPlaythroughState>(coordinator);
	coordinatorRef.current = coordinator;
	const onSessionCompleteRef = useRef(onSessionComplete);
	onSessionCompleteRef.current = onSessionComplete;
	const currentScenario =
		(activeScenarios[
			coordinator.session.activeScenarioIndex
		] as ScenarioItem) ?? null;
	const media = useSessionMedia(
		autoplay,
		coordinator.generation,
		vod,
		coordinatorRef,
		dispatch,
		onMediaDiagnostics,
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
			nowMs: Date.now(),
			scenarioId: scenario.id,
			type: "TIMEOUT_REQUESTED",
		});
	}, []);
	const remainingMs = useScenarioCountdown(
		coordinator.deadlineAtMs,
		coordinator.session.overlayState?.status === "unanswered" &&
			coordinator.mediaHealth === "ready",
		onTimeout,
	);
	useSessionEffects(
		coordinator.effects,
		dispatch,
		media,
		recordAttempt,
		onSessionCompleteRef,
		playthroughId,
	);
	return {
		coordinator,
		coordinatorRef,
		currentScenario,
		dispatch,
		media,
		remainingMs,
	};
}

export function useSessionPlayer({
	autoplay = true,
	initialManifest,
	onSessionComplete,
	onMediaDiagnostics,
	vodId,
	playthroughId,
	scenarioSnapshotIds,
}: UseSessionPlayerOptions): UseSessionPlayerResult {
	const vod = initialManifest ?? null;
	const activeScenarios = useSessionScenarios(vod, scenarioSnapshotIds);
	const runtime = useSessionPlayerRuntime({
		activeScenarios,
		autoplay,
		onMediaDiagnostics,
		onSessionComplete,
		playthroughId,
		vod,
	});
	const { coordinator, coordinatorRef, currentScenario, remainingMs, media } =
		runtime;
	const actions = useSessionPlayerActions(
		runtime.dispatch,
		coordinatorRef,
		vodId,
	);

	return {
		activeScenarioIndex: coordinator.session.activeScenarioIndex,
		activeScenarios,
		attempts: coordinator.session.attempts,
		containerRef: media.containerRef,
		currentScenario,
		currentTime: media.currentTime,
		duration: media.duration,
		...actions,
		isReady: media.isReady,
		mediaHealth: coordinator.mediaHealth,
		overlayState: coordinator.session.overlayState,
		playbackStatus: media.status,
		remainingMs,
		state: coordinator.session.state,
		summary: coordinator.summary,
		totalMs: coordinator.session.totalMs,
		vod,
	};
}

export { getScenarioLimitMs };
