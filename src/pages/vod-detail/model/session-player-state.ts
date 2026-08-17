import { PlaybackStatus } from "@/shared/media";
import type { ScenarioOverlayState } from "./session-contract";
import type { SessionAttempt } from "./summary";

export type SessionPlayerState =
	| "LOADING"
	| "PLAYING"
	| "PAUSED_USER"
	| "SCENARIO_ACTIVE"
	| "FEEDBACK"
	| "COMPLETED";

export interface SessionPlayerSession {
	activeScenarioIndex: number;
	attempts: SessionAttempt[];
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

type AnsweredOverlayState = Extract<
	ScenarioOverlayState,
	{ status: "answered" }
>;
type TimedOutOverlayState = Extract<
	ScenarioOverlayState,
	{ status: "timedOut" }
>;

export type SessionPlayerAction =
	| { autoplay: boolean; type: "PLAYER_READY" }
	| { status: PlaybackStatus; type: "PLAYBACK_STATUS_CHANGED" }
	| { type: "PAUSE_REQUESTED" }
	| { type: "PLAY_REQUESTED" }
	| { totalMs?: number; type: "SCENARIO_TRIGGERED" }
	| {
			attempt: SessionAttempt;
			overlayState: AnsweredOverlayState;
			type: "ANSWER_RECORDED";
	  }
	| {
			attempt: SessionAttempt;
			overlayState: TimedOutOverlayState;
			type: "TIMEOUT_RECORDED";
	  }
	| { type: "REPLAY_CONTEXT" }
	| { type: "RESUME_PLAYBACK" }
	| { type: "UNSUPPORTED_INPUT_SKIPPED" }
	| { type: "RETRY_SESSION" };

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

function handlePlayerReady(
	session: SessionPlayerSession,
	action: Extract<SessionPlayerAction, { type: "PLAYER_READY" }>,
): SessionPlayerSession {
	if (session.state !== "LOADING") return session;
	return {
		...session,
		state: action.autoplay ? "PLAYING" : "PAUSED_USER",
	};
}

function handlePlaybackStatusChanged(
	session: SessionPlayerSession,
	action: Extract<SessionPlayerAction, { type: "PLAYBACK_STATUS_CHANGED" }>,
): SessionPlayerSession {
	const nextState = resolveNewStatusState(session.state, action.status);
	return nextState ? { ...session, state: nextState } : session;
}

function handlePauseRequested(
	session: SessionPlayerSession,
): SessionPlayerSession {
	return session.state === "PLAYING"
		? { ...session, state: "PAUSED_USER" }
		: session;
}

function handlePlayRequested(
	session: SessionPlayerSession,
): SessionPlayerSession {
	return session.state === "PAUSED_USER"
		? { ...session, state: "PLAYING" }
		: session;
}

function handleScenarioTriggered(
	session: SessionPlayerSession,
	action: Extract<SessionPlayerAction, { type: "SCENARIO_TRIGGERED" }>,
): SessionPlayerSession {
	if (session.state !== "PLAYING") return session;
	return {
		...session,
		overlayState: { status: "unanswered" },
		state: "SCENARIO_ACTIVE",
		totalMs: action.totalMs,
	};
}

function handleFeedbackRecorded(
	session: SessionPlayerSession,
	action: Extract<
		SessionPlayerAction,
		{ type: "ANSWER_RECORDED" | "TIMEOUT_RECORDED" }
	>,
): SessionPlayerSession {
	if (
		session.state !== "SCENARIO_ACTIVE" ||
		session.overlayState?.status !== "unanswered"
	) {
		return session;
	}
	return {
		...session,
		attempts: [...session.attempts, action.attempt],
		overlayState: action.overlayState,
		state: "FEEDBACK",
	};
}

function handleReplayContext(
	session: SessionPlayerSession,
): SessionPlayerSession {
	return session.state === "SCENARIO_ACTIVE"
		? {
				...session,
				overlayState: null,
				state: "PLAYING",
				totalMs: undefined,
			}
		: session;
}

function handleResumePlayback(
	session: SessionPlayerSession,
): SessionPlayerSession {
	return session.state === "FEEDBACK" ? transitionToPlayback(session) : session;
}

function transitionToPlayback(
	session: SessionPlayerSession,
): SessionPlayerSession {
	return {
		...session,
		activeScenarioIndex: session.activeScenarioIndex + 1,
		overlayState: null,
		state: "PLAYING",
		totalMs: undefined,
	};
}

function handleUnsupportedInputSkipped(
	session: SessionPlayerSession,
): SessionPlayerSession {
	return session.state === "SCENARIO_ACTIVE" &&
		session.overlayState?.status === "unanswered"
		? transitionToPlayback(session)
		: session;
}

function handleRetrySession(): SessionPlayerSession {
	return {
		...initialSessionPlayerSession,
		state: "PLAYING",
	};
}

export function sessionPlayerReducer(
	session: SessionPlayerSession,
	action: SessionPlayerAction,
): SessionPlayerSession {
	switch (action.type) {
		case "PLAYER_READY":
			return handlePlayerReady(session, action);
		case "PLAYBACK_STATUS_CHANGED":
			return handlePlaybackStatusChanged(session, action);
		case "PAUSE_REQUESTED":
			return handlePauseRequested(session);
		case "PLAY_REQUESTED":
			return handlePlayRequested(session);
		case "SCENARIO_TRIGGERED":
			return handleScenarioTriggered(session, action);
		case "ANSWER_RECORDED":
		case "TIMEOUT_RECORDED":
			return handleFeedbackRecorded(session, action);
		case "REPLAY_CONTEXT":
			return handleReplayContext(session);
		case "RESUME_PLAYBACK":
			return handleResumePlayback(session);
		case "UNSUPPORTED_INPUT_SKIPPED":
			return handleUnsupportedInputSkipped(session);
		case "RETRY_SESSION":
			return handleRetrySession();
	}
}
