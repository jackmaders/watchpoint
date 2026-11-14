import { type RefObject, useCallback, useEffect, useRef, useState } from "react";

import { type CheckpointPoller, createCheckpointPoller } from "./checkpoint-poller";
import type { VodCheckpoint } from "./vod-detail";
import { createYouTubeVodPlayerAdapter, type VodPlayerAdapter } from "./vod-player-adapter";

const EMPTY_ANSWERED_CHECKPOINTS = new Set<string>();

interface UseVodPlayerSessionInput {
  checkpoints: readonly VodCheckpoint[];
  youtubeVideoId: string;
}

interface VodPlayerSessionState {
  activeCheckpoint: VodCheckpoint | null;
  playerHostRef: RefObject<HTMLDivElement | null>;
  selectCheckpoint: (checkpoint: VodCheckpoint) => void;
  selectOption: (optionIndex: number) => void;
  selectedOptionIndex: number | null;
}

interface PlayerSessionController {
  adapter: VodPlayerAdapter;
  poller: CheckpointPoller;
}

interface MountVodPlayerSessionInput {
  checkpointsRef: RefObject<readonly VodCheckpoint[]>;
  container: HTMLElement;
  controllerRef: RefObject<PlayerSessionController | null>;
  onCheckpointReached: (checkpoint: VodCheckpoint) => void;
  youtubeVideoId: string;
}

function useVodPlayerSession({
  checkpoints,
  youtubeVideoId,
}: UseVodPlayerSessionInput): VodPlayerSessionState {
  const playerHostRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<PlayerSessionController | null>(null);
  const checkpointsRef = useRef(checkpoints);

  const [activeCheckpointId, setActiveCheckpointId] = useState<string | null>(null);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);

  useEffect(() => {
    checkpointsRef.current = checkpoints;
  }, [checkpoints]);

  useEffect(() => {
    const container = playerHostRef.current;
    const cleanup = container
      ? mountVodPlayerSession({
          checkpointsRef,
          container,
          controllerRef,
          onCheckpointReached: (checkpoint) => {
            setActiveCheckpointId(checkpoint.id);
            setSelectedOptionIndex(null);
          },
          youtubeVideoId,
        })
      : undefined;

    return cleanup;
  }, [youtubeVideoId]);

  const selectCheckpoint = useCallback((checkpoint: VodCheckpoint) => {
    seekControllerToCheckpoint(controllerRef.current, checkpoint.timeSec);
    setActiveCheckpointId(checkpoint.id);
    setSelectedOptionIndex(null);
  }, []);

  const activeCheckpoint =
    checkpoints.find((checkpoint) => checkpoint.id === activeCheckpointId) ?? null;

  return {
    activeCheckpoint,
    playerHostRef,
    selectCheckpoint,
    selectOption: setSelectedOptionIndex,
    selectedOptionIndex,
  };
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

function mountVodPlayerSession({
  checkpointsRef,
  container,
  controllerRef,
  onCheckpointReached,
  youtubeVideoId,
}: MountVodPlayerSessionInput): () => void {
  const poller = createCheckpointPoller({
    getAnsweredCheckpointIds: () => EMPTY_ANSWERED_CHECKPOINTS,
    getCheckpoints: () => checkpointsRef.current,
    getCurrentTime: () => adapter.getCurrentTime(),
    onCheckpointCrossed: (checkpoint) => {
      adapter.pause();
      onCheckpointReached(checkpoint);
    },
  });

  const adapter = createYouTubeVodPlayerAdapter({
    container,
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

export { useVodPlayerSession, type UseVodPlayerSessionInput, type VodPlayerSessionState };
