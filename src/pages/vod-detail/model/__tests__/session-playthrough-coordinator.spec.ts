import { describe, expect, it } from "vitest";
import { PlaybackStatus } from "@/shared/media";
import {
	createSessionPlaythroughState,
	getScenarioLimitMs,
	type SessionScenario,
	sessionPlaythroughReducer,
} from "../session-playthrough-coordinator";

const scenario: SessionScenario = {
	id: "scenario-1",
	input: {
		correctOptionId: "option-1",
		evaluateAnswer: (optionId) => optionId === "option-1",
		inputType: "MULTIPLE_CHOICE",
		kind: "multiple-choice",
		options: [{ id: "option-1", text: "Correct" }],
	},
	moduleType: "STRATEGY",
	timestampSeconds: 30,
};

const timedScenario: SessionScenario = {
	...scenario,
	id: "scenario-2",
	moduleType: "TACTICS",
	timeLimitSeconds: 2,
	timestampSeconds: 60,
};

function readyPlayingState(scenarios: readonly SessionScenario[] = [scenario]) {
	const initial = createSessionPlaythroughState(scenarios);
	return sessionPlaythroughReducer(initial, {
		autoplay: true,
		generation: initial.generation,
		type: "PLAYER_READY",
	});
}

describe("session playthrough coordinator", () => {
	it("creates a generation and accepts only its player events", () => {
		// Arrange
		const state = createSessionPlaythroughState([scenario]);

		// Act
		const ignored = sessionPlaythroughReducer(state, {
			autoplay: true,
			generation: 0,
			type: "PLAYER_READY",
		});
		const ready = readyPlayingState();

		// Assert
		expect(state.generation).toBe(1);
		expect(ignored).toBe(state);
		expect(ready.session.state).toBe("PLAYING");
	});

	it("coordinates media controls, replay, resume, and unsupported skips", () => {
		// Arrange
		const state = readyPlayingState([scenario]);
		const unsupported: SessionScenario = {
			...scenario,
			id: "unsupported",
			input: {
				correctOptionId: "",
				evaluateAnswer: () => false,
				inputType: "UNSUPPORTED",
				kind: "unsupported",
				options: [],
				reason: "unsupported-input-type",
			},
		};

		// Act
		const paused = sessionPlaythroughReducer(state, {
			generation: state.generation,
			type: "PAUSE_REQUESTED",
		});
		const played = sessionPlaythroughReducer(paused, {
			generation: state.generation,
			type: "PLAY_REQUESTED",
		});
		const active = sessionPlaythroughReducer(played, {
			generation: state.generation,
			nowMs: 1000,
			time: 30,
			type: "TIME_UPDATED",
		});
		const replayed = sessionPlaythroughReducer(active, {
			generation: state.generation,
			type: "REPLAY_CONTEXT",
		});
		const answered = sessionPlaythroughReducer(active, {
			generation: state.generation,
			nowMs: 1100,
			optionId: "option-1",
			scenarioId: scenario.id,
			type: "OPTION_SELECTED",
		});
		const resumed = sessionPlaythroughReducer(answered, {
			generation: state.generation,
			type: "RESUME_PLAYBACK",
		});
		const unsupportedState = readyPlayingState([unsupported]);
		const unsupportedActive = sessionPlaythroughReducer(unsupportedState, {
			generation: unsupportedState.generation,
			nowMs: 1000,
			time: 30,
			type: "TIME_UPDATED",
		});
		const skipped = sessionPlaythroughReducer(unsupportedActive, {
			generation: unsupportedState.generation,
			type: "UNSUPPORTED_INPUT_SKIPPED",
		});

		// Assert
		expect(paused.session.state).toBe("PAUSED_USER");
		expect(played.session.state).toBe("PLAYING");
		expect(replayed.effects.at(-1)?.type).toBe("MEDIA_REPLAY_CONTEXT");
		expect(resumed.session.activeScenarioIndex).toBe(1);
		expect(skipped.session.activeScenarioIndex).toBe(1);
	});

	it("rejects stale control events and replay without a current scenario", () => {
		// Arrange
		const state = readyPlayingState([scenario]);
		const staleGeneration = state.generation - 1;

		// Act
		const stalePause = sessionPlaythroughReducer(state, {
			generation: staleGeneration,
			type: "PAUSE_REQUESTED",
		});
		const stalePlay = sessionPlaythroughReducer(state, {
			generation: staleGeneration,
			type: "PLAY_REQUESTED",
		});
		const staleReplay = sessionPlaythroughReducer(state, {
			generation: staleGeneration,
			type: "REPLAY_CONTEXT",
		});
		const staleResume = sessionPlaythroughReducer(state, {
			generation: staleGeneration,
			type: "RESUME_PLAYBACK",
		});
		const empty = createSessionPlaythroughState([]);
		const emptyReplay = sessionPlaythroughReducer(empty, {
			generation: empty.generation,
			type: "REPLAY_CONTEXT",
		});
		const emptyPlaying = {
			...empty,
			session: { ...empty.session, state: "PLAYING" as const },
		};
		const emptyTime = sessionPlaythroughReducer(emptyPlaying, {
			generation: empty.generation,
			nowMs: 1000,
			time: 30,
			type: "TIME_UPDATED",
		});

		// Assert
		expect(stalePause).toBe(state);
		expect(stalePlay).toBe(state);
		expect(staleReplay).toBe(state);
		expect(staleResume).toBe(state);
		expect(emptyReplay).toBe(empty);
		expect(emptyTime).toBe(emptyPlaying);
	});

	it("triggers a scenario once and emits a media pause effect", () => {
		// Arrange
		const state = readyPlayingState();

		// Act
		const triggered = sessionPlaythroughReducer(state, {
			generation: state.generation,
			nowMs: 1000,
			time: 30,
			type: "TIME_UPDATED",
		});
		const repeated = sessionPlaythroughReducer(triggered, {
			generation: state.generation,
			nowMs: 1100,
			time: 30.5,
			type: "TIME_UPDATED",
		});

		// Assert
		expect(triggered.session.state).toBe("SCENARIO_ACTIVE");
		expect(triggered.effects).toEqual([{ generation: 1, type: "MEDIA_PAUSE" }]);
		expect(repeated).toBe(triggered);
	});

	it("uses the deadline for timeout and rejects an early or stale timeout", () => {
		// Arrange
		const state = readyPlayingState([timedScenario]);
		const active = sessionPlaythroughReducer(state, {
			generation: state.generation,
			nowMs: 1000,
			time: 60,
			type: "TIME_UPDATED",
		});
		const deadline = active.deadlineAtMs ?? 0;

		// Act
		const early = sessionPlaythroughReducer(active, {
			deadlineAtMs: deadline,
			generation: active.generation,
			nowMs: deadline - 1,
			scenarioId: timedScenario.id,
			type: "TIMEOUT_REQUESTED",
		});
		const timedOut = sessionPlaythroughReducer(active, {
			deadlineAtMs: deadline,
			generation: active.generation,
			nowMs: deadline,
			scenarioId: timedScenario.id,
			type: "TIMEOUT_REQUESTED",
		});

		// Assert
		expect(early).toBe(active);
		expect(timedOut.session.state).toBe("FEEDBACK");
		expect(timedOut.session.attempts[0]?.isTimedOut).toBe(true);
		expect(timedOut.effects.at(-1)?.type).toBe("RECORD_ATTEMPT");
	});

	it("keeps a defensive zero response time for an invalid untimed timeout state", () => {
		// Arrange
		const state = readyPlayingState();
		const active = sessionPlaythroughReducer(state, {
			generation: state.generation,
			nowMs: 1000,
			time: 30,
			type: "TIME_UPDATED",
		});
		const defensiveTimedState = { ...active, deadlineAtMs: 0 };

		// Act
		const timedOut = sessionPlaythroughReducer(defensiveTimedState, {
			deadlineAtMs: 0,
			generation: active.generation,
			nowMs: 0,
			scenarioId: scenario.id,
			type: "TIMEOUT_REQUESTED",
		});

		// Assert
		expect(timedOut.session.attempts[0]?.responseTimeMs).toBe(0);
	});

	it("accepts an answer once and wins the answer-timeout race", () => {
		// Arrange
		const state = readyPlayingState([timedScenario]);
		const active = sessionPlaythroughReducer(state, {
			generation: state.generation,
			nowMs: 1000,
			time: 60,
			type: "TIME_UPDATED",
		});
		const deadline = active.deadlineAtMs ?? 0;

		// Act
		const answered = sessionPlaythroughReducer(active, {
			generation: active.generation,
			nowMs: 1500,
			optionId: "option-1",
			scenarioId: timedScenario.id,
			type: "OPTION_SELECTED",
		});
		const lateAnswer = sessionPlaythroughReducer(active, {
			generation: active.generation,
			nowMs: deadline,
			optionId: "option-1",
			scenarioId: timedScenario.id,
			type: "OPTION_SELECTED",
		});
		const lateTimeout = sessionPlaythroughReducer(answered, {
			deadlineAtMs: deadline,
			generation: active.generation,
			nowMs: deadline,
			scenarioId: timedScenario.id,
			type: "TIMEOUT_REQUESTED",
		});

		// Assert
		expect(answered.session.state).toBe("FEEDBACK");
		expect(answered.session.attempts).toHaveLength(1);
		expect(answered.session.attempts[0]?.responseTimeMs).toBe(500);
		expect(lateAnswer.session.overlayState?.status).toBe("timedOut");
		expect(lateTimeout).toBe(answered);
	});

	it("emits one keyed persistence outcome for either side of the answer-timeout race", () => {
		// Arrange
		const state = readyPlayingState([timedScenario]);
		const active = sessionPlaythroughReducer(state, {
			generation: state.generation,
			nowMs: 1000,
			time: 60,
			type: "TIME_UPDATED",
		});
		const deadline = active.deadlineAtMs ?? 0;

		// Act
		const answered = sessionPlaythroughReducer(active, {
			generation: active.generation,
			idempotencyKey: "answer-key",
			nowMs: 1500,
			optionId: "option-1",
			scenarioId: timedScenario.id,
			type: "OPTION_SELECTED",
		});
		const answeredThenTimedOut = sessionPlaythroughReducer(answered, {
			deadlineAtMs: deadline,
			generation: active.generation,
			idempotencyKey: "timeout-key",
			nowMs: deadline,
			scenarioId: timedScenario.id,
			type: "TIMEOUT_REQUESTED",
		});
		const timedOut = sessionPlaythroughReducer(active, {
			deadlineAtMs: deadline,
			generation: active.generation,
			idempotencyKey: "timeout-key",
			nowMs: deadline,
			scenarioId: timedScenario.id,
			type: "TIMEOUT_REQUESTED",
		});
		const timedOutThenAnswered = sessionPlaythroughReducer(timedOut, {
			generation: active.generation,
			idempotencyKey: "answer-key",
			nowMs: 1500,
			optionId: "option-1",
			scenarioId: timedScenario.id,
			type: "OPTION_SELECTED",
		});
		const answeredPersistenceEffects = answered.effects.filter(
			(effect) => effect.type === "RECORD_ATTEMPT",
		);
		const timedOutPersistenceEffects = timedOut.effects.filter(
			(effect) => effect.type === "RECORD_ATTEMPT",
		);

		// Assert
		expect(answeredThenTimedOut).toBe(answered);
		expect(answeredPersistenceEffects).toHaveLength(1);
		expect(answeredPersistenceEffects[0]).toMatchObject({
			outcome: { idempotencyKey: "answer-key" },
			type: "RECORD_ATTEMPT",
		});
		expect(timedOutThenAnswered).toBe(timedOut);
		expect(timedOutPersistenceEffects).toHaveLength(1);
		expect(timedOutPersistenceEffects[0]).toMatchObject({
			outcome: { idempotencyKey: "timeout-key" },
			type: "RECORD_ATTEMPT",
		});
	});

	it("rejects stale answer and timeout events", () => {
		// Arrange
		const state = readyPlayingState([timedScenario]);
		const active = sessionPlaythroughReducer(state, {
			generation: state.generation,
			nowMs: 1000,
			time: 60,
			type: "TIME_UPDATED",
		});
		const deadline = active.deadlineAtMs ?? 0;

		// Act
		const staleAnswer = sessionPlaythroughReducer(active, {
			generation: active.generation - 1,
			nowMs: 1200,
			optionId: "option-1",
			scenarioId: timedScenario.id,
			type: "OPTION_SELECTED",
		});
		const staleTimeout = sessionPlaythroughReducer(active, {
			deadlineAtMs: deadline,
			generation: active.generation - 1,
			nowMs: deadline,
			scenarioId: timedScenario.id,
			type: "TIMEOUT_REQUESTED",
		});
		const missingStart = sessionPlaythroughReducer(
			{ ...active, scenarioStartedAtMs: undefined },
			{
				generation: active.generation,
				nowMs: 1200,
				optionId: "option-1",
				scenarioId: timedScenario.id,
				type: "OPTION_SELECTED",
			},
		);

		// Assert
		expect(staleAnswer).toBe(active);
		expect(staleTimeout).toBe(active);
		expect(missingStart.session.attempts[0]?.responseTimeMs).toBe(0);
	});

	it("replays the current scenario without advancing and waits for the seek", () => {
		// Arrange
		const state = readyPlayingState();
		const active = sessionPlaythroughReducer(state, {
			generation: state.generation,
			nowMs: 1000,
			time: 30,
			type: "TIME_UPDATED",
		});

		// Act
		const replayed = sessionPlaythroughReducer(active, {
			generation: active.generation,
			type: "REPLAY_CONTEXT",
		});
		const staleTime = sessionPlaythroughReducer(replayed, {
			generation: active.generation,
			nowMs: 1100,
			time: 30,
			type: "TIME_UPDATED",
		});
		const seeked = sessionPlaythroughReducer(staleTime, {
			generation: active.generation,
			nowMs: 1200,
			time: 20,
			type: "TIME_UPDATED",
		});

		// Assert
		expect(replayed.session.state).toBe("PLAYING");
		expect(replayed.session.activeScenarioIndex).toBe(0);
		expect(replayed.effects.at(-1)?.type).toBe("MEDIA_REPLAY_CONTEXT");
		expect(staleTime).toBe(replayed);
		expect(seeked.replayAwaitingSeek).toBe(false);
	});

	it("increments the generation for manifest changes and retry, and completes once", () => {
		// Arrange
		const state = readyPlayingState([scenario]);

		// Act
		const changed = sessionPlaythroughReducer(state, {
			autoplay: true,
			scenarios: [scenario],
			type: "MANIFEST_CHANGED",
		});
		const retried = sessionPlaythroughReducer(changed, {
			autoplay: true,
			type: "RETRY_SESSION",
		});
		const staleEnded = sessionPlaythroughReducer(retried, {
			generation: retried.generation,
			status: PlaybackStatus.ENDED,
			type: "PLAYBACK_STATUS_CHANGED",
		});
		const playing = sessionPlaythroughReducer(staleEnded, {
			generation: retried.generation,
			status: PlaybackStatus.PLAYING,
			type: "PLAYBACK_STATUS_CHANGED",
		});
		const reset = sessionPlaythroughReducer(playing, {
			generation: retried.generation,
			nowMs: 1000,
			time: 0,
			type: "TIME_UPDATED",
		});
		const staleTime = sessionPlaythroughReducer(retried, {
			generation: retried.generation,
			nowMs: 1000,
			time: 60,
			type: "TIME_UPDATED",
		});
		const completed = sessionPlaythroughReducer(reset, {
			generation: retried.generation,
			status: PlaybackStatus.ENDED,
			type: "PLAYBACK_STATUS_CHANGED",
		});
		const duplicate = sessionPlaythroughReducer(completed, {
			generation: retried.generation,
			status: PlaybackStatus.ENDED,
			type: "PLAYBACK_STATUS_CHANGED",
		});

		// Assert
		expect(changed.generation).toBe(2);
		expect(changed.session.state).toBe("LOADING");
		expect(retried.generation).toBe(3);
		expect(retried.session.state).toBe("PLAYING");
		expect(staleEnded).toBe(retried);
		expect(playing).toBe(retried);
		expect(reset.restartPending).toBe(false);
		expect(staleTime).toBe(retried);
		expect(completed.session.state).toBe("COMPLETED");
		expect(completed.effects.at(-1)?.type).toBe("SESSION_COMPLETED");
		expect(duplicate).toBe(completed);
	});

	it("consumes queued effects and ignores an already empty queue", () => {
		// Arrange
		const state = readyPlayingState();
		const triggered = sessionPlaythroughReducer(state, {
			generation: state.generation,
			nowMs: 1000,
			time: 30,
			type: "TIME_UPDATED",
		});

		// Act
		const consumed = sessionPlaythroughReducer(triggered, {
			type: "EFFECTS_CONSUMED",
		});
		const inert = sessionPlaythroughReducer(consumed, {
			type: "EFFECTS_CONSUMED",
		});

		// Assert
		expect(consumed.effects).toEqual([]);
		expect(inert).toBe(consumed);
	});

	it("returns the configured and default scenario limits", () => {
		// Arrange
		const untimed = { ...scenario, moduleType: "STRATEGY" as const };
		const tacticsDefault = { ...timedScenario, timeLimitSeconds: null };

		// Act
		const custom = getScenarioLimitMs(timedScenario);
		const fallback = getScenarioLimitMs(tacticsDefault);
		const none = getScenarioLimitMs(untimed);

		// Assert
		expect(custom).toBe(2000);
		expect(fallback).toBe(3000);
		expect(none).toBeUndefined();
	});
});
