import type { ModuleType } from "@/shared/db";
import { PlaybackStatus } from "@/shared/media";
import type { ScenarioInput, ScenarioOverlayState } from "./session-contract";
import {
	initialSessionPlayerSession,
	type SessionPlayerAction,
	type SessionPlayerSession,
	sessionPlayerReducer,
} from "./session-player-state";
import {
	calculateSessionSummary,
	type SessionAttempt,
	type SessionSummaryReport,
} from "./summary";

export interface SessionScenario {
	id: string;
	input: ScenarioInput;
	moduleType: ModuleType;
	timestampSeconds: number;
	timeLimitSeconds?: number | null;
}

export type SessionAttemptOutcome =
	| {
			attempt: SessionAttempt;
			idempotencyKey: string;
			kind: "answered";
			selectedOptionId: string;
	  }
	| {
			attempt: SessionAttempt;
			idempotencyKey: string;
			kind: "timedOut";
	  };

export type SessionPlaythroughEffect =
	| { generation: number; type: "MEDIA_PAUSE" }
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
	effects: readonly SessionPlaythroughEffect[];
}

export type SessionPlaythroughAction =
	| { autoplay: boolean; generation: number; type: "PLAYER_READY" }
	| {
			generation: number;
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
			idempotencyKey?: string;
			nowMs: number;
			optionId: string;
			scenarioId: string;
			type: "OPTION_SELECTED";
	  }
	| {
			deadlineAtMs: number;
			generation: number;
			idempotencyKey?: string;
			nowMs: number;
			scenarioId: string;
			type: "TIMEOUT_REQUESTED";
	  }
	| { generation: number; type: "REPLAY_CONTEXT" }
	| { generation: number; type: "RESUME_PLAYBACK" }
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
		replayAwaitingSeek: false,
		restartPending: false,
		scenarios,
		session: initialSessionPlayerSession,
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

function withSession(
	state: SessionPlaythroughState,
	action: SessionPlayerAction,
	patch: Partial<SessionPlaythroughState> = {},
	effects: readonly SessionPlaythroughEffect[] = [],
): SessionPlaythroughState {
	const session = sessionPlayerReducer(state.session, action);
	if (session === state.session) return state;
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
	return withSession(
		state,
		{ totalMs, type: "SCENARIO_TRIGGERED" },
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

function resolveAttemptIdempotencyKey(idempotencyKey?: string): string {
	return idempotencyKey ?? crypto.randomUUID();
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
			idempotencyKey: action.idempotencyKey,
			nowMs: action.nowMs,
			scenarioId: scenario.id,
			type: "TIMEOUT_REQUESTED",
		});
	}

	const isCorrect = scenario.input.evaluateAnswer(action.optionId);
	const attempt: SessionAttempt = {
		isCorrect,
		moduleType: scenario.moduleType,
		responseTimeMs: getResponseTimeMs(state, action.nowMs),
		scenarioId: scenario.id,
	};
	const overlayState: Extract<ScenarioOverlayState, { status: "answered" }> = {
		correctOptionId: scenario.input.correctOptionId,
		isCorrect,
		selectedOptionId: action.optionId,
		status: "answered",
	};
	return withSession(
		state,
		{ attempt, overlayState, type: "ANSWER_RECORDED" },
		{ deadlineAtMs: undefined, scenarioStartedAtMs: undefined },
		[
			{
				generation: state.generation,
				outcome: {
					attempt,
					idempotencyKey: resolveAttemptIdempotencyKey(action.idempotencyKey),
					kind: "answered",
					selectedOptionId: action.optionId,
				},
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

	const attempt: SessionAttempt = {
		isCorrect: false,
		isTimedOut: true,
		moduleType: scenario.moduleType,
		responseTimeMs: state.session.totalMs ?? 0,
		scenarioId: scenario.id,
	};
	const overlayState: Extract<ScenarioOverlayState, { status: "timedOut" }> = {
		correctOptionId: scenario.input.correctOptionId,
		isCorrect: false,
		status: "timedOut",
	};
	return withSession(
		state,
		{ attempt, overlayState, type: "TIMEOUT_RECORDED" },
		{ deadlineAtMs: undefined, scenarioStartedAtMs: undefined },
		[
			{
				generation: state.generation,
				outcome: {
					attempt,
					idempotencyKey: resolveAttemptIdempotencyKey(action.idempotencyKey),
					kind: "timedOut",
				},
				type: "RECORD_ATTEMPT",
			},
		],
	);
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
	const session = sessionPlayerReducer(state.session, {
		status: action.status,
		type: "PLAYBACK_STATUS_CHANGED",
	});
	if (session === state.session) return state;
	if (action.status !== PlaybackStatus.ENDED || session.state !== "COMPLETED") {
		return withEffects(state, { session });
	}
	return withEffects(
		state,
		{
			deadlineAtMs: undefined,
			scenarioStartedAtMs: undefined,
			session,
		},
		[
			{
				generation: state.generation,
				summary: calculateSessionSummary(session.attempts),
				type: "SESSION_COMPLETED",
			},
		],
	);
}

function handlePauseRequested(
	state: SessionPlaythroughState,
	action: Extract<SessionPlaythroughAction, { type: "PAUSE_REQUESTED" }>,
): SessionPlaythroughState {
	return isCurrentGeneration(state, action)
		? withSession(state, { type: "PAUSE_REQUESTED" }, {}, [
				{ generation: state.generation, type: "MEDIA_PAUSE" },
			])
		: state;
}

function handlePlayRequested(
	state: SessionPlaythroughState,
	action: Extract<SessionPlaythroughAction, { type: "PLAY_REQUESTED" }>,
): SessionPlaythroughState {
	return isCurrentGeneration(state, action)
		? withSession(state, { type: "PLAY_REQUESTED" }, {}, [
				{
					generation: state.generation,
					reason: "play",
					type: "MEDIA_PLAY",
				},
			])
		: state;
}

function handleReplayContext(
	state: SessionPlaythroughState,
	action: Extract<SessionPlaythroughAction, { type: "REPLAY_CONTEXT" }>,
): SessionPlaythroughState {
	if (!isCurrentGeneration(state, action)) return state;
	const scenario = getCurrentScenario(state);
	if (!scenario) return state;
	return withSession(
		state,
		{ type: "REPLAY_CONTEXT" },
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
	return isCurrentGeneration(state, action)
		? withSession(
				state,
				{ type: "RESUME_PLAYBACK" },
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
			)
		: state;
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
	return withSession(
		state,
		{ type: "UNSUPPORTED_INPUT_SKIPPED" },
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
	};
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

	switch (action.type) {
		case "PLAYER_READY":
			return isCurrentGeneration(state, action)
				? withSession(
						state,
						{
							autoplay: action.autoplay,
							type: "PLAYER_READY",
						},
						{ restartPending: false },
					)
				: state;
		case "PLAYBACK_STATUS_CHANGED":
			return handlePlaybackStatusChanged(state, action);
		case "TIME_UPDATED":
			return state.restartPending
				? handleRestartPendingTime(state, action)
				: handleTimeUpdated(state, action);
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
		case "RESUME_PLAYBACK":
			return handleResumePlayback(state, action);
		case "UNSUPPORTED_INPUT_SKIPPED":
			return handleUnsupportedInputSkipped(state, action);
		case "RETRY_SESSION":
			return handleRetrySession(state, action);
	}
}
