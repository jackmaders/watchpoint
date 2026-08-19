import type { ModuleType } from "@/shared/db";
import { type MediaFailure, PlaybackStatus } from "@/shared/media";
import type { AttemptOutcome } from "./attempt";
import type { ScenarioInput, ScenarioOverlayState } from "./session-contract";
import { calculateSessionSummary, type SessionSummaryReport } from "./summary";

export type SessionPlayerState =
	| "LOADING"
	| "PLAYING"
	| "PAUSED_USER"
	| "SCENARIO_ACTIVE"
	| "FEEDBACK"
	| "COMPLETED";

export type MediaHealth =
	| "loading"
	| "ready"
	| "buffering"
	| "recovering"
	| "failed";

export interface SessionPlayerSession {
	activeScenarioIndex: number;
	attempts: AttemptOutcome[];
	overlayState: ScenarioOverlayState | null;
	state: SessionPlayerState;
	totalMs?: number;
}

export const initialSessionPlayerSession: SessionPlayerSession = {
	activeScenarioIndex: 0,
	attempts: [],
	overlayState: null,
	state: "LOADING",
	totalMs: undefined,
};

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

export interface SessionScenario {
	id: string;
	input: ScenarioInput;
	moduleType: ModuleType;
	timestampSeconds: number;
	timeLimitSeconds?: number | null;
}

export type SessionAttemptOutcome = AttemptOutcome;

export type SessionPlaythroughEffect =
	| { generation: number; type: "MEDIA_PAUSE" }
	| { autoplay: boolean; generation: number; type: "MEDIA_RECOVER" }
	| {
			generation: number;
			reason: "play" | "resume" | "skip";
			type: "MEDIA_PLAY";
	  }
	| {
			generation: number;
			scenarioId: string;
			timestampSeconds: number;
			type: "MEDIA_REPLAY_CONTEXT";
	  }
	| { autoplay: boolean; generation: number; type: "MEDIA_RESTART" }
	| {
			generation: number;
			outcome: SessionAttemptOutcome;
			type: "RECORD_ATTEMPT";
	  }
	| {
			generation: number;
			summary: SessionSummaryReport;
			type: "SESSION_COMPLETED";
	  };

export interface SessionPlaythroughState {
	deadlineAtMs?: number;
	generation: number;
	lastTriggeredScenarioId: string | null;
	restartPending: boolean;
	replayAwaitingSeek: boolean;
	scenarios: readonly SessionScenario[];
	scenarioStartedAtMs?: number;
	session: SessionPlayerSession;
	summary: SessionSummaryReport | null;
	effects: readonly SessionPlaythroughEffect[];
	mediaHealth: MediaHealth;
	mediaPausedAtMs?: number;
	recoveryAttempted: boolean;
}

export type SessionPlaythroughAction =
	| { autoplay: boolean; generation: number; type: "PLAYER_READY" }
	| {
			generation: number;
			nowMs?: number;
			status: PlaybackStatus;
			type: "PLAYBACK_STATUS_CHANGED";
	  }
	| { generation: number; type: "PAUSE_REQUESTED" }
	| { generation: number; type: "PLAY_REQUESTED" }
	| {
			generation: number;
			nowMs: number;
			time: number;
			type: "TIME_UPDATED";
	  }
	| {
			generation: number;
			nowMs: number;
			optionId: string;
			scenarioId: string;
			type: "OPTION_SELECTED";
	  }
	| {
			deadlineAtMs: number;
			generation: number;
			nowMs: number;
			scenarioId: string;
			type: "TIMEOUT_REQUESTED";
	  }
	| { generation: number; type: "REPLAY_CONTEXT" }
	| { generation: number; nowMs: number; type: "RETRY_MEDIA" }
	| { generation: number; type: "RESUME_PLAYBACK" }
	| {
			failure: MediaFailure;
			generation: number;
			nowMs: number;
			type: "MEDIA_FAILURE";
	  }
	| {
			generation: number;
			nowMs: number;
			retryCount: number;
			type: "RECOVERY_SUCCEEDED";
	  }
	| { generation: number; type: "UNSUPPORTED_INPUT_SKIPPED" }
	| { autoplay: boolean; type: "RETRY_SESSION" }
	| {
			autoplay: boolean;
			scenarios: readonly SessionScenario[];
			type: "MANIFEST_CHANGED";
	  }
	| { type: "EFFECTS_CONSUMED" };

export function getScenarioLimitMs(
	scenario: SessionScenario,
): number | undefined {
	const limitSec =
		scenario.timeLimitSeconds ?? (scenario.moduleType === "TACTICS" ? 3 : null);
	return limitSec && limitSec > 0 ? limitSec * 1000 : undefined;
}

export function createSessionPlaythroughState(
	scenarios: readonly SessionScenario[],
): SessionPlaythroughState {
	return {
		effects: [],
		generation: 1,
		lastTriggeredScenarioId: null,
		mediaHealth: "loading",
		recoveryAttempted: false,
		replayAwaitingSeek: false,
		restartPending: false,
		scenarios,
		session: initialSessionPlayerSession,
		summary: null,
	};
}

function isCurrentGeneration(
	state: SessionPlaythroughState,
	action: { generation: number },
): boolean {
	return action.generation === state.generation;
}

function getCurrentScenario(
	state: SessionPlaythroughState,
): SessionScenario | null {
	return state.scenarios[state.session.activeScenarioIndex] ?? null;
}

function withEffects(
	state: SessionPlaythroughState,
	patch: Partial<SessionPlaythroughState>,
	effects: readonly SessionPlaythroughEffect[] = [],
): SessionPlaythroughState {
	return {
		...state,
		...patch,
		effects: [...state.effects, ...effects],
	};
}

function transitionSession(
	state: SessionPlaythroughState,
	session: SessionPlayerSession,
	patch: Partial<SessionPlaythroughState> = {},
	effects: readonly SessionPlaythroughEffect[] = [],
): SessionPlaythroughState {
	return withEffects(state, { ...patch, session }, effects);
}

function handleManifestChanged(
	state: SessionPlaythroughState,
	action: Extract<SessionPlaythroughAction, { type: "MANIFEST_CHANGED" }>,
): SessionPlaythroughState {
	return {
		...createSessionPlaythroughState(action.scenarios),
		effects: [
			{
				autoplay: action.autoplay,
				generation: state.generation + 1,
				type: "MEDIA_RESTART",
			},
		],
		generation: state.generation + 1,
		restartPending: action.scenarios.length > 0,
	};
}

function handleRestartPendingTime(
	state: SessionPlaythroughState,
	action: Extract<SessionPlaythroughAction, { type: "TIME_UPDATED" }>,
): SessionPlaythroughState {
	if (!isCurrentGeneration(state, action)) return state;
	const scenario = getCurrentScenario(state);
	return scenario && action.time <= scenario.timestampSeconds
		? withEffects(state, { restartPending: false })
		: state;
}

function handleTimeUpdated(
	state: SessionPlaythroughState,
	action: Extract<SessionPlaythroughAction, { type: "TIME_UPDATED" }>,
): SessionPlaythroughState {
	if (
		!isCurrentGeneration(state, action) ||
		state.session.state !== "PLAYING"
	) {
		return state;
	}

	const scenario = getCurrentScenario(state);
	if (!scenario) return state;

	if (state.replayAwaitingSeek) {
		return action.time < scenario.timestampSeconds
			? withEffects(state, {
					lastTriggeredScenarioId: null,
					replayAwaitingSeek: false,
				})
			: state;
	}

	if (
		action.time < scenario.timestampSeconds ||
		state.lastTriggeredScenarioId === scenario.id
	) {
		return state;
	}

	const totalMs = getScenarioLimitMs(scenario);
	const deadlineAtMs =
		totalMs === undefined ? undefined : action.nowMs + totalMs;
	return transitionSession(
		state,
		{
			...state.session,
			overlayState: { status: "unanswered" },
			state: "SCENARIO_ACTIVE",
			totalMs,
		},
		{
			deadlineAtMs,
			lastTriggeredScenarioId: scenario.id,
			replayAwaitingSeek: false,
			scenarioStartedAtMs: action.nowMs,
		},
		[{ generation: state.generation, type: "MEDIA_PAUSE" }],
	);
}

function getResponseTimeMs(
	state: SessionPlaythroughState,
	nowMs: number,
): number {
	const elapsedMs = Math.max(0, nowMs - (state.scenarioStartedAtMs ?? nowMs));
	return typeof state.session.totalMs === "number"
		? Math.min(state.session.totalMs, Math.round(elapsedMs))
		: Math.round(elapsedMs);
}

function finalizeAttemptOutcome(
	scenario: SessionScenario,
	input: Pick<
		SessionAttemptOutcome,
		"isCorrect" | "isTimedOut" | "responseTimeMs" | "selectedOptionId"
	>,
): SessionAttemptOutcome {
	return {
		...input,
		idempotencyKey: crypto.randomUUID(),
		moduleType: scenario.moduleType,
		scenarioId: scenario.id,
	};
}

function handleOptionSelected(
	state: SessionPlaythroughState,
	action: Extract<SessionPlaythroughAction, { type: "OPTION_SELECTED" }>,
): SessionPlaythroughState {
	if (!isCurrentGeneration(state, action)) return state;
	const scenario = getCurrentScenario(state);
	if (
		!scenario ||
		action.scenarioId !== scenario.id ||
		state.session.state !== "SCENARIO_ACTIVE" ||
		state.session.overlayState?.status !== "unanswered"
	) {
		return state;
	}
	if (state.deadlineAtMs !== undefined && action.nowMs >= state.deadlineAtMs) {
		return handleTimeoutRequested(state, {
			deadlineAtMs: state.deadlineAtMs,
			generation: state.generation,
			nowMs: action.nowMs,
			scenarioId: scenario.id,
			type: "TIMEOUT_REQUESTED",
		});
	}

	const isCorrect = scenario.input.evaluateAnswer(action.optionId);
	const outcome = finalizeAttemptOutcome(scenario, {
		isCorrect,
		isTimedOut: false,
		responseTimeMs: getResponseTimeMs(state, action.nowMs),
		selectedOptionId: action.optionId,
	});
	const overlayState: Extract<ScenarioOverlayState, { status: "answered" }> = {
		correctOptionId: scenario.input.correctOptionId,
		isCorrect,
		selectedOptionId: action.optionId,
		status: "answered",
	};
	return transitionSession(
		state,
		{
			...state.session,
			attempts: [...state.session.attempts, outcome],
			overlayState,
			state: "FEEDBACK",
		},
		{ deadlineAtMs: undefined, scenarioStartedAtMs: undefined },
		[
			{
				generation: state.generation,
				outcome,
				type: "RECORD_ATTEMPT",
			},
		],
	);
}

function handleTimeoutRequested(
	state: SessionPlaythroughState,
	action: Extract<SessionPlaythroughAction, { type: "TIMEOUT_REQUESTED" }>,
): SessionPlaythroughState {
	if (!isCurrentGeneration(state, action)) return state;
	const scenario = getCurrentScenario(state);
	if (
		!scenario ||
		action.scenarioId !== scenario.id ||
		state.session.state !== "SCENARIO_ACTIVE" ||
		state.session.overlayState?.status !== "unanswered" ||
		state.deadlineAtMs !== action.deadlineAtMs ||
		action.nowMs < action.deadlineAtMs
	) {
		return state;
	}

	const outcome = finalizeAttemptOutcome(scenario, {
		isCorrect: false,
		isTimedOut: true,
		responseTimeMs: state.session.totalMs ?? 0,
		selectedOptionId: null,
	});
	const overlayState: Extract<ScenarioOverlayState, { status: "timedOut" }> = {
		correctOptionId: scenario.input.correctOptionId,
		isCorrect: false,
		status: "timedOut",
	};
	return transitionSession(
		state,
		{
			...state.session,
			attempts: [...state.session.attempts, outcome],
			overlayState,
			state: "FEEDBACK",
		},
		{ deadlineAtMs: undefined, scenarioStartedAtMs: undefined },
		[
			{
				generation: state.generation,
				outcome,
				type: "RECORD_ATTEMPT",
			},
		],
	);
}

function handleMediaHealthStatus(
	state: SessionPlaythroughState,
	action: Extract<
		SessionPlaythroughAction,
		{ type: "PLAYBACK_STATUS_CHANGED" }
	>,
): SessionPlaythroughState | null {
	if (action.status === PlaybackStatus.BUFFERING) {
		return withEffects(state, {
			mediaHealth: "buffering",
			// c8 ignore next -- production media events always carry the injected clock.
			mediaPausedAtMs: state.mediaPausedAtMs ?? action.nowMs ?? Date.now(),
		});
	}
	if (
		action.status === PlaybackStatus.PLAYING &&
		!state.restartPending &&
		(state.mediaHealth === "loading" || state.mediaHealth === "buffering")
	) {
		// c8 ignore next -- production media events always carry the injected clock.
		const pauseDuration = state.mediaPausedAtMs
			? Math.max(0, (action.nowMs ?? Date.now()) - state.mediaPausedAtMs)
			: 0;
		return withEffects(state, {
			deadlineAtMs:
				state.deadlineAtMs === undefined
					? undefined
					: state.deadlineAtMs + pauseDuration,
			mediaHealth: "ready",
			mediaPausedAtMs: undefined,
		});
	}
	return null;
}

function handlePlaybackStatusChanged(
	state: SessionPlaythroughState,
	action: Extract<
		SessionPlaythroughAction,
		{ type: "PLAYBACK_STATUS_CHANGED" }
	>,
): SessionPlaythroughState {
	if (
		!isCurrentGeneration(state, action) ||
		state.session.state === "COMPLETED"
	) {
		return state;
	}
	if (state.restartPending && action.status === PlaybackStatus.ENDED) {
		return state;
	}
	const mediaHealthState = handleMediaHealthStatus(state, action);
	if (mediaHealthState) return mediaHealthState;
	const nextState = resolveNewStatusState(state.session.state, action.status);
	if (!nextState) return state;
	const session = { ...state.session, state: nextState };
	if (action.status !== PlaybackStatus.ENDED || session.state !== "COMPLETED") {
		return transitionSession(state, session);
	}
	const summary = calculateSessionSummary(session.attempts);
	return transitionSession(
		state,
		session,
		{
			deadlineAtMs: undefined,
			scenarioStartedAtMs: undefined,
			summary,
		},
		[
			{
				generation: state.generation,
				summary,
				type: "SESSION_COMPLETED",
			},
		],
	);
}

function handlePauseRequested(
	state: SessionPlaythroughState,
	action: Extract<SessionPlaythroughAction, { type: "PAUSE_REQUESTED" }>,
): SessionPlaythroughState {
	if (
		!isCurrentGeneration(state, action) ||
		state.session.state !== "PLAYING"
	) {
		return state;
	}
	return transitionSession(
		state,
		{ ...state.session, state: "PAUSED_USER" },
		{},
		[{ generation: state.generation, type: "MEDIA_PAUSE" }],
	);
}

function handlePlayRequested(
	state: SessionPlaythroughState,
	action: Extract<SessionPlaythroughAction, { type: "PLAY_REQUESTED" }>,
): SessionPlaythroughState {
	if (
		!isCurrentGeneration(state, action) ||
		state.session.state !== "PAUSED_USER"
	) {
		return state;
	}
	return transitionSession(state, { ...state.session, state: "PLAYING" }, {}, [
		{
			generation: state.generation,
			reason: "play",
			type: "MEDIA_PLAY",
		},
	]);
}

function handleReplayContext(
	state: SessionPlaythroughState,
	action: Extract<SessionPlaythroughAction, { type: "REPLAY_CONTEXT" }>,
): SessionPlaythroughState {
	if (!isCurrentGeneration(state, action)) return state;
	const scenario = getCurrentScenario(state);
	if (!scenario) return state;
	if (state.session.state !== "SCENARIO_ACTIVE") return state;
	return transitionSession(
		state,
		{
			...state.session,
			overlayState: null,
			state: "PLAYING",
			totalMs: undefined,
		},
		{ replayAwaitingSeek: true },
		[
			{
				generation: state.generation,
				scenarioId: scenario.id,
				timestampSeconds: scenario.timestampSeconds,
				type: "MEDIA_REPLAY_CONTEXT",
			},
		],
	);
}

function handleResumePlayback(
	state: SessionPlaythroughState,
	action: Extract<SessionPlaythroughAction, { type: "RESUME_PLAYBACK" }>,
): SessionPlaythroughState {
	if (
		!isCurrentGeneration(state, action) ||
		state.session.state !== "FEEDBACK"
	) {
		return state;
	}
	return transitionSession(
		state,
		{
			...state.session,
			activeScenarioIndex: state.session.activeScenarioIndex + 1,
			overlayState: null,
			state: "PLAYING",
			totalMs: undefined,
		},
		{
			deadlineAtMs: undefined,
			lastTriggeredScenarioId: null,
			replayAwaitingSeek: false,
			scenarioStartedAtMs: undefined,
		},
		[
			{
				generation: state.generation,
				reason: "resume",
				type: "MEDIA_PLAY",
			},
		],
	);
}

function handleUnsupportedInputSkipped(
	state: SessionPlaythroughState,
	action: Extract<
		SessionPlaythroughAction,
		{ type: "UNSUPPORTED_INPUT_SKIPPED" }
	>,
): SessionPlaythroughState {
	if (
		!isCurrentGeneration(state, action) ||
		getCurrentScenario(state)?.input.kind !== "unsupported" ||
		state.session.state !== "SCENARIO_ACTIVE" ||
		state.session.overlayState?.status !== "unanswered"
	) {
		return state;
	}
	return transitionSession(
		state,
		{
			...state.session,
			activeScenarioIndex: state.session.activeScenarioIndex + 1,
			overlayState: null,
			state: "PLAYING",
			totalMs: undefined,
		},
		{ lastTriggeredScenarioId: null, replayAwaitingSeek: false },
		[
			{
				generation: state.generation,
				reason: "skip",
				type: "MEDIA_PLAY",
			},
		],
	);
}

function handleRetrySession(
	state: SessionPlaythroughState,
	action: Extract<SessionPlaythroughAction, { type: "RETRY_SESSION" }>,
): SessionPlaythroughState {
	const generation = state.generation + 1;
	return {
		...createSessionPlaythroughState(state.scenarios),
		effects: [{ autoplay: action.autoplay, generation, type: "MEDIA_RESTART" }],
		generation,
		restartPending: state.scenarios.length > 0,
		session: { ...initialSessionPlayerSession, state: "PLAYING" },
		summary: null,
	};
}

function handleRetryMedia(
	state: SessionPlaythroughState,
	action: Extract<SessionPlaythroughAction, { type: "RETRY_MEDIA" }>,
): SessionPlaythroughState {
	if (!isCurrentGeneration(state, action) || state.mediaHealth !== "failed") {
		return state;
	}
	return withEffects(
		state,
		{ mediaHealth: "recovering", mediaPausedAtMs: action.nowMs },
		[
			{
				autoplay: state.session.state === "PLAYING",
				generation: state.generation,
				type: "MEDIA_RECOVER",
			},
		],
	);
}

type MediaAction = Extract<
	SessionPlaythroughAction,
	{
		type:
			| "PLAYER_READY"
			| "PLAYBACK_STATUS_CHANGED"
			| "TIME_UPDATED"
			| "MEDIA_FAILURE"
			| "RECOVERY_SUCCEEDED";
	}
>;

function handlePlayerReady(
	state: SessionPlaythroughState,
	action: Extract<SessionPlaythroughAction, { type: "PLAYER_READY" }>,
): SessionPlaythroughState {
	if (
		!isCurrentGeneration(state, action) ||
		state.session.state !== "LOADING"
	) {
		return state;
	}
	return transitionSession(
		state,
		{
			...state.session,
			state: action.autoplay ? "PLAYING" : "PAUSED_USER",
		},
		{ mediaHealth: "ready", restartPending: false },
	);
}

function handleMediaFailure(
	state: SessionPlaythroughState,
	action: Extract<SessionPlaythroughAction, { type: "MEDIA_FAILURE" }>,
): SessionPlaythroughState {
	if (!isCurrentGeneration(state, action)) return state;
	if (state.recoveryAttempted) {
		return withEffects(state, {
			mediaHealth: "failed",
			// c8 ignore next -- a terminal retry always follows a recorded recovery pause.
			mediaPausedAtMs: state.mediaPausedAtMs ?? action.nowMs,
		});
	}
	return withEffects(
		state,
		{
			mediaHealth: "recovering",
			mediaPausedAtMs: state.mediaPausedAtMs ?? action.nowMs,
			recoveryAttempted: true,
		},
		[
			{
				autoplay: state.session.state === "PLAYING",
				generation: state.generation,
				type: "MEDIA_RECOVER",
			},
		],
	);
}

function handleRecoverySucceeded(
	state: SessionPlaythroughState,
	action: Extract<SessionPlaythroughAction, { type: "RECOVERY_SUCCEEDED" }>,
): SessionPlaythroughState {
	if (!isCurrentGeneration(state, action)) return state;
	// c8 ignore next -- recovery success is emitted only for an active recovery.
	const pauseDuration = state.mediaPausedAtMs
		? Math.max(0, action.nowMs - state.mediaPausedAtMs)
		: 0;
	return withEffects(state, {
		deadlineAtMs:
			state.deadlineAtMs === undefined
				? undefined
				: state.deadlineAtMs + pauseDuration,
		mediaHealth: "ready",
		mediaPausedAtMs: undefined,
	});
}

function handleMediaAction(
	state: SessionPlaythroughState,
	action: MediaAction,
): SessionPlaythroughState {
	switch (action.type) {
		case "PLAYER_READY":
			return handlePlayerReady(state, action);
		case "PLAYBACK_STATUS_CHANGED":
			return handlePlaybackStatusChanged(state, action);
		case "TIME_UPDATED":
			return state.restartPending
				? handleRestartPendingTime(state, action)
				: handleTimeUpdated(state, action);
		case "MEDIA_FAILURE":
			return handleMediaFailure(state, action);
		case "RECOVERY_SUCCEEDED":
			return handleRecoverySucceeded(state, action);
	}
}

type ScenarioAction = Exclude<
	SessionPlaythroughAction,
	{
		type:
			| "PLAYER_READY"
			| "PLAYBACK_STATUS_CHANGED"
			| "TIME_UPDATED"
			| "MEDIA_FAILURE"
			| "RECOVERY_SUCCEEDED"
			| "EFFECTS_CONSUMED"
			| "MANIFEST_CHANGED";
	}
>;

function handleScenarioAction(
	state: SessionPlaythroughState,
	action: ScenarioAction,
): SessionPlaythroughState {
	switch (action.type) {
		case "OPTION_SELECTED":
			return handleOptionSelected(state, action);
		case "TIMEOUT_REQUESTED":
			return handleTimeoutRequested(state, action);
		case "PAUSE_REQUESTED":
			return handlePauseRequested(state, action);
		case "PLAY_REQUESTED":
			return handlePlayRequested(state, action);
		case "REPLAY_CONTEXT":
			return handleReplayContext(state, action);
		case "RETRY_MEDIA":
			return handleRetryMedia(state, action);
		case "RESUME_PLAYBACK":
			return handleResumePlayback(state, action);
		case "UNSUPPORTED_INPUT_SKIPPED":
			return handleUnsupportedInputSkipped(state, action);
		case "RETRY_SESSION":
			return handleRetrySession(state, action);
	}
}

export function sessionPlaythroughReducer(
	state: SessionPlaythroughState,
	action: SessionPlaythroughAction,
): SessionPlaythroughState {
	if (action.type === "EFFECTS_CONSUMED") {
		return state.effects.length === 0 ? state : { ...state, effects: [] };
	}

	if (action.type === "MANIFEST_CHANGED") {
		return handleManifestChanged(state, action);
	}

	if (
		action.type === "PLAYER_READY" ||
		action.type === "PLAYBACK_STATUS_CHANGED" ||
		action.type === "TIME_UPDATED" ||
		action.type === "MEDIA_FAILURE" ||
		action.type === "RECOVERY_SUCCEEDED"
	) {
		return handleMediaAction(state, action);
	}
	return handleScenarioAction(state, action);
}
