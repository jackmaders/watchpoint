import type { VodCheckpoint } from "./vod-detail";
import type { VodPlayerState } from "./vod-player-adapter";

interface FindCrossedCheckpointInput {
  answeredCheckpointIds: ReadonlySet<string>;
  checkpoints: readonly VodCheckpoint[];
  currentTimeSec: number;
  previousTimeSec: number;
}

interface CreateCheckpointPollerOptions {
  getAnsweredCheckpointIds: () => ReadonlySet<string>;
  getCheckpoints: () => readonly VodCheckpoint[];
  getCurrentTime: () => number;
  onCheckpointCrossed: (checkpoint: VodCheckpoint) => void;
}

interface CheckpointPoller {
  handlePlayerStateChange: (state: VodPlayerState) => void;
  start: () => void;
  stop: () => void;
  syncTime: (timeSec: number) => void;
}

interface PollerState {
  frameId: number | null;
  previousTimeSec: number;
}

function createCheckpointPoller(options: CreateCheckpointPollerOptions): CheckpointPoller {
  const state: PollerState = {
    frameId: null,
    previousTimeSec: 0,
  };

  function tick() {
    runPollerTick(state, options, tick);
  }

  function start() {
    if (state.frameId !== null) {
      return;
    }
    state.frameId = window.requestAnimationFrame(tick);
  }

  function stop() {
    if (state.frameId === null) {
      return;
    }
    window.cancelAnimationFrame(state.frameId);
    state.frameId = null;
  }

  return {
    handlePlayerStateChange: (playerState) => {
      if (playerState === "PLAYING") {
        start();
        return;
      }
      stop();
    },
    start,
    stop,
    syncTime: (timeSec) => {
      state.previousTimeSec = timeSec;
    },
  };
}

function findCrossedCheckpoint({
  answeredCheckpointIds,
  checkpoints,
  currentTimeSec,
  previousTimeSec,
}: FindCrossedCheckpointInput): VodCheckpoint | null {
  return (
    checkpoints.find(
      (checkpoint) =>
        !answeredCheckpointIds.has(checkpoint.id) &&
        previousTimeSec < checkpoint.timeSec &&
        currentTimeSec >= checkpoint.timeSec,
    ) ?? null
  );
}

function runPollerTick(
  state: PollerState,
  options: CreateCheckpointPollerOptions,
  tickCallback: FrameRequestCallback,
) {
  state.frameId = null;
  const currentTimeSec = options.getCurrentTime();
  const crossedCheckpoint = findCrossedCheckpoint({
    answeredCheckpointIds: options.getAnsweredCheckpointIds(),
    checkpoints: options.getCheckpoints(),
    currentTimeSec,
    previousTimeSec: state.previousTimeSec,
  });
  state.previousTimeSec = currentTimeSec;

  if (crossedCheckpoint) {
    options.onCheckpointCrossed(crossedCheckpoint);
    return;
  }

  state.frameId = window.requestAnimationFrame(tickCallback);
}

export {
  createCheckpointPoller,
  findCrossedCheckpoint,
  type CheckpointPoller,
  type CreateCheckpointPollerOptions,
  type FindCrossedCheckpointInput,
};
