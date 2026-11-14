const YT_STATE_PLAYING = 1;
const YT_STATE_PAUSED = 2;
interface StubYouTubePlayerSnapshot {
  currentTime: number;
  currentTimeReadCount: number;
  host: string;
  isReady: boolean;
  pausedCount: number;
  playCount: number;
  seekCalls: number[];
  state: "UNSTARTED" | "PLAYING" | "PAUSED";
  videoId: string;
}
interface WatchpointYtStub {
  blockNextPlay: () => void;
  emitError: (errorCode: number) => void;
  getSnapshot: () => StubYouTubePlayerSnapshot | null;
  play: () => number;
  setCurrentTime: (timeSec: number) => number;
}
declare global {
  var watchpointYtStub: WatchpointYtStub | undefined;
}
const YOUTUBE_IFRAME_API_STUB_SCRIPT = `
(() => {
  const STATE_PLAYING = ${YT_STATE_PLAYING};
  const STATE_PAUSED = ${YT_STATE_PAUSED};
  let activePlayer = null;
  let activeSnapshot = null;
  let activeEvents = null;
  let shouldBlockNextPlay = false;
  class StubYouTubePlayer {
    constructor(element, options) {
      const snapshot = {
        currentTime: 0,
        currentTimeReadCount: 0,
        host: options.host || "",
        isReady: false,
        pausedCount: 0,
        playCount: 0,
        seekCalls: [],
        state: "UNSTARTED",
        videoId: options.videoId || "",
      };
      this.snapshot = snapshot;
      activePlayer = this;
      activeEvents = options.events || {};
      activeSnapshot = snapshot;
      shouldBlockNextPlay = false;
      element.dataset.stubVideoId = snapshot.videoId;
      queueMicrotask(() => {
        if (activeSnapshot !== snapshot) return;
        snapshot.isReady = true;
        if (activeEvents && typeof activeEvents.onReady === "function") {
          activeEvents.onReady();
        }
      });
    }
    getCurrentTime() {
      if (!activeSnapshot) return 0;
      activeSnapshot.currentTimeReadCount += 1;
      return activeSnapshot.currentTime;
    }
    playVideo() {
      if (!activeSnapshot) return;
      activeSnapshot.playCount += 1;
      if (shouldBlockNextPlay) {
        shouldBlockNextPlay = false;
        if (activeEvents && typeof activeEvents.onAutoplayBlocked === "function") {
          activeEvents.onAutoplayBlocked();
        }
        return;
      }
      activeSnapshot.state = "PLAYING";
      if (activeEvents && typeof activeEvents.onStateChange === "function") {
        activeEvents.onStateChange({ data: STATE_PLAYING });
      }
    }
    pauseVideo() {
      if (!activeSnapshot) return;
      activeSnapshot.pausedCount += 1;
      activeSnapshot.state = "PAUSED";
      if (activeEvents && typeof activeEvents.onStateChange === "function") {
        activeEvents.onStateChange({ data: STATE_PAUSED });
      }
    }
    seekTo(seconds) {
      if (!activeSnapshot) return;
      activeSnapshot.currentTime = seconds;
      activeSnapshot.seekCalls.push(seconds);
    }
    destroy() {
      if (activeSnapshot === this.snapshot) {
        activePlayer = null;
        activeSnapshot = null;
        activeEvents = null;
        shouldBlockNextPlay = false;
      }
    }
  }
  window.YT = { Player: StubYouTubePlayer };
  globalThis.watchpointYtStub = {
    blockNextPlay() {
      shouldBlockNextPlay = true;
    },
    emitError(errorCode) {
      if (!activeEvents || typeof activeEvents.onError !== "function") return;
      activeEvents.onError({ data: errorCode });
    },
    getSnapshot() {
      return activeSnapshot;
    },
    play() {
      if (!activePlayer || !activeSnapshot) return 0;
      activePlayer.playVideo();
      return activeSnapshot.currentTimeReadCount;
    },
    setCurrentTime(timeSec) {
      if (!activeSnapshot) return 0;
      activeSnapshot.currentTime = timeSec;
      return activeSnapshot.currentTimeReadCount;
    },
  };
  if (typeof window.onYouTubeIframeAPIReady === "function") {
    window.onYouTubeIframeAPIReady();
  }
})();
`;
export { YOUTUBE_IFRAME_API_STUB_SCRIPT };
export type { StubYouTubePlayerSnapshot };
