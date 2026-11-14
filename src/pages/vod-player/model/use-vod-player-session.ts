import { type RefObject, useCallback, useEffect, useRef, useState } from "react";

import { type CheckpointPoller, createCheckpointPoller } from "./checkpoint-poller";
import type { VodCheckpoint } from "./vod-detail";
import {
  createYouTubeVodPlayerAdapter,
  type VodPlayerAdapter,
  type VodPlayerErrorCode,
} from "./vod-player-adapter";

interface CheckpointAnswer {
  isCorrect: boolean;
  selectedOptionIndex: number;
}

type VodPlayerFatalError = Exclude<VodPlayerErrorCode, "AUTOPLAY_BLOCKED">;

interface UseVodPlayerSessionInput {
  checkpoints: readonly VodCheckpoint[];
  youtubeVideoId: string;
}

interface VodPlayerSessionState {
  activeAnswer: CheckpointAnswer | null;
  activeCheckpoint: VodCheckpoint | null;
  answers: ReadonlyMap<string, CheckpointAnswer>;
  playerError: VodPlayerFatalError | null;
  playerHostRef: RefObject<HTMLDivElement | null>;
  resetSession: () => void;
  resumeVod: () => void;
  selectCheckpoint: (checkpoint: VodCheckpoint) => void;
  selectOption: (optionIndex: number) => void;
}

interface PlayerSessionController {
  adapter: VodPlayerAdapter;
  poller: CheckpointPoller;
}

interface MutableSessionRefs {
  activeCheckpointId: string | null;
  answeredIds: Set<string>;
  answers: Map<string, CheckpointAnswer>;
  checkpoints: readonly VodCheckpoint[];
}

interface SessionStore {
  activateCheckpoint: (checkpointId: string | null) => void;
  activeCheckpointId: string | null;
  answers: ReadonlyMap<string, CheckpointAnswer>;
  clearAnswers: () => void;
  getAnsweredIds: () => ReadonlySet<string>;
  getCheckpoints: () => readonly VodCheckpoint[];
  playerError: VodPlayerFatalError | null;
  recordOption: (optionIndex: number) => void;
  reportFatalError: (errorCode: VodPlayerFatalError) => void;
}

interface MountVodPlayerSessionInput {
  container: HTMLElement;
  controllerRef: RefObject<PlayerSessionController | null>;
  getAnsweredIds: () => ReadonlySet<string>;
  getCheckpoints: () => readonly VodCheckpoint[];
  onCheckpointReached: (checkpoint: VodCheckpoint) => void;
  onFatalError: (errorCode: VodPlayerFatalError) => void;
  youtubeVideoId: string;
}

function useVodPlayerSession({
  checkpoints,
  youtubeVideoId,
}: UseVodPlayerSessionInput): VodPlayerSessionState {
  const store = useVodSessionStore(checkpoints);
  const { controllerRef, playerHostRef } = useVodSessionAdapter({ store, youtubeVideoId });
  const actions = useVodSessionActions({ controllerRef, store });
  const activeCheckpoint =
    checkpoints.find((checkpoint) => checkpoint.id === store.activeCheckpointId) ?? null;

  return {
    activeAnswer: activeCheckpoint ? (store.answers.get(activeCheckpoint.id) ?? null) : null,
    activeCheckpoint,
    answers: store.answers,
    playerError: store.playerError,
    playerHostRef,
    ...actions,
  };
}

function useVodSessionStore(checkpoints: readonly VodCheckpoint[]): SessionStore {
  const refs = useRef<MutableSessionRefs>({
    activeCheckpointId: null,
    answeredIds: new Set(),
    answers: new Map(),
    checkpoints,
  });
  const [activeCheckpointId, setActiveCheckpointId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<ReadonlyMap<string, CheckpointAnswer>>(() => new Map());
  const [playerError, setPlayerError] = useState<VodPlayerFatalError | null>(null);

  useEffect(() => {
    refs.current.checkpoints = checkpoints;
  }, [checkpoints]);

  const activateCheckpoint = useCallback((checkpointId: string | null) => {
    refs.current.activeCheckpointId = checkpointId;
    setActiveCheckpointId(checkpointId);
  }, []);

  const recordOption = useCallback((optionIndex: number) => {
    const nextAnswers = commitCheckpointAnswer(refs.current, optionIndex);
    if (nextAnswers) {
      refs.current.answers = nextAnswers;
      setAnswers(nextAnswers);
    }
  }, []);

  const clearAnswers = useCallback(() => {
    const emptyAnswers = new Map<string, CheckpointAnswer>();
    refs.current.answeredIds = new Set();
    refs.current.answers = emptyAnswers;
    setAnswers(emptyAnswers);
  }, []);

  return {
    activateCheckpoint,
    activeCheckpointId,
    answers,
    clearAnswers,
    getAnsweredIds: useCallback(() => refs.current.answeredIds, []),
    getCheckpoints: useCallback(() => refs.current.checkpoints, []),
    playerError,
    recordOption,
    reportFatalError: setPlayerError,
  };
}

function useVodSessionAdapter({
  store,
  youtubeVideoId,
}: {
  store: SessionStore;
  youtubeVideoId: string;
}) {
  const playerHostRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<PlayerSessionController | null>(null);
  const { activateCheckpoint, getAnsweredIds, getCheckpoints, reportFatalError } = store;

  useEffect(() => {
    const container = playerHostRef.current;
    return container
      ? mountVodPlayerSession({
          container,
          controllerRef,
          getAnsweredIds,
          getCheckpoints,
          onCheckpointReached: (checkpoint) => {
            activateCheckpoint(checkpoint.id);
          },
          onFatalError: reportFatalError,
          youtubeVideoId,
        })
      : undefined;
  }, [activateCheckpoint, getAnsweredIds, getCheckpoints, reportFatalError, youtubeVideoId]);

  return { controllerRef, playerHostRef };
}

function useVodSessionActions({
  controllerRef,
  store,
}: {
  controllerRef: RefObject<PlayerSessionController | null>;
  store: SessionStore;
}) {
  const { activateCheckpoint, clearAnswers, recordOption } = store;

  const selectCheckpoint = useCallback(
    (checkpoint: VodCheckpoint) => {
      seekControllerToCheckpoint(controllerRef.current, checkpoint.timeSec);
      activateCheckpoint(checkpoint.id);
    },
    [activateCheckpoint, controllerRef],
  );

  const resumeVod = useCallback(() => {
    activateCheckpoint(null);
    controllerRef.current?.adapter.play();
  }, [activateCheckpoint, controllerRef]);

  const resetSession = useCallback(() => {
    clearAnswers();
    activateCheckpoint(null);
    syncControllerToCurrentTime(controllerRef.current);
  }, [activateCheckpoint, clearAnswers, controllerRef]);

  return { resetSession, resumeVod, selectCheckpoint, selectOption: recordOption };
}

function commitCheckpointAnswer(
  mutableState: MutableSessionRefs,
  optionIndex: number,
): Map<string, CheckpointAnswer> | null {
  const checkpoint =
    mutableState.checkpoints.find((item) => item.id === mutableState.activeCheckpointId) ?? null;
  if (!checkpoint || mutableState.answers.has(checkpoint.id)) {
    return null;
  }

  mutableState.answeredIds.add(checkpoint.id);
  const answer: CheckpointAnswer = {
    isCorrect: optionIndex === checkpoint.correctOptionIndex,
    selectedOptionIndex: optionIndex,
  };
  return new Map([...mutableState.answers, [checkpoint.id, answer]]);
}

function seekControllerToCheckpoint(controller: PlayerSessionController | null, timeSec: number) {
  if (!controller) {
    return;
  }
  controller.poller.stop();
  controller.poller.syncTime(timeSec);
  controller.adapter.seekTo(timeSec);
  controller.adapter.pause();
}

function syncControllerToCurrentTime(controller: PlayerSessionController | null) {
  if (!controller) {
    return;
  }
  controller.poller.syncTime(controller.adapter.getCurrentTime());
}

function mountVodPlayerSession({
  container,
  controllerRef,
  getAnsweredIds,
  getCheckpoints,
  onCheckpointReached,
  onFatalError,
  youtubeVideoId,
}: MountVodPlayerSessionInput): () => void {
  const poller = createCheckpointPoller({
    getAnsweredCheckpointIds: getAnsweredIds,
    getCheckpoints,
    getCurrentTime: () => adapter.getCurrentTime(),
    onCheckpointCrossed: (checkpoint) => {
      adapter.pause();
      onCheckpointReached(checkpoint);
    },
  });

  const adapter = createYouTubeVodPlayerAdapter({
    container,
    onError: (errorCode) => {
      if (errorCode === "AUTOPLAY_BLOCKED") {
        return;
      }
      poller.stop();
      adapter.destroy();
      controllerRef.current = null;
      onFatalError(errorCode);
    },
    onStateChange: (playerState) => {
      poller.handlePlayerStateChange(playerState);
    },
  });

  controllerRef.current = { adapter, poller };
  adapter.load(youtubeVideoId);

  return () => {
    poller.stop();
    adapter.destroy();
    controllerRef.current = null;
  };
}

export {
  useVodPlayerSession,
  type CheckpointAnswer,
  type UseVodPlayerSessionInput,
  type VodPlayerFatalError,
  type VodPlayerSessionState,
};
