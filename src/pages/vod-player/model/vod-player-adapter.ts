import {
  loadYouTubeIframeApi,
  type YouTubePlayerInstance,
  type YouTubePlayerOptions,
} from "./youtube-iframe-api";

const YOUTUBE_NOCOOKIE_HOST = "https://www.youtube-nocookie.com";

const YOUTUBE_STATE_ENDED = 0;
const YOUTUBE_STATE_PLAYING = 1;
const YOUTUBE_STATE_PAUSED = 2;

const YOUTUBE_ERROR_NOT_FOUND = 100;
const YOUTUBE_ERROR_EMBED_DISABLED = 101;
const YOUTUBE_ERROR_EMBED_DISABLED_ALT = 150;

type VodPlayerState = "PLAYING" | "PAUSED" | "ENDED";

type VodPlayerErrorCode = "AUTOPLAY_BLOCKED" | "EMBED_DISABLED" | "NOT_FOUND" | "PLAYBACK_ERROR";

interface VodPlayerAdapter {
  destroy: () => void;
  getCurrentTime: () => number;
  load: (videoId: string) => void;
  pause: () => void;
  play: () => void;
  seekTo: (timeSec: number) => void;
}

interface CreateYouTubeVodPlayerAdapterOptions {
  container: HTMLElement;
  onError?: ((error: VodPlayerErrorCode) => void) | undefined;
  onStateChange?: ((state: VodPlayerState) => void) | undefined;
}

interface AdapterState {
  activePlayer: YouTubePlayerInstance | null;
  cancelPendingApiLoad: (() => void) | null;
  isDestroyed: boolean;
  pendingPause: boolean;
  pendingSeekSec: number | null;
  readyPlayer: YouTubePlayerInstance | null;
}

function createYouTubeVodPlayerAdapter(
  options: CreateYouTubeVodPlayerAdapterOptions,
): VodPlayerAdapter {
  const state: AdapterState = {
    activePlayer: null,
    cancelPendingApiLoad: null,
    isDestroyed: false,
    pendingPause: false,
    pendingSeekSec: null,
    readyPlayer: null,
  };

  return {
    destroy: () => {
      destroyAdapter(state, options.container);
    },
    getCurrentTime: () => getAdapterCurrentTime(state),
    load: (videoId) => {
      loadAdapterVideo(state, options, videoId);
    },
    pause: () => {
      pauseAdapter(state);
    },
    play: () => {
      playAdapter(state);
    },
    seekTo: (timeSec) => {
      seekAdapter(state, timeSec);
    },
  };
}

function loadAdapterVideo(
  state: AdapterState,
  options: CreateYouTubeVodPlayerAdapterOptions,
  videoId: string,
) {
  if (state.isDestroyed) {
    return;
  }
  state.pendingSeekSec = null;
  state.pendingPause = false;
  state.cancelPendingApiLoad?.();
  state.cancelPendingApiLoad = null;

  if (window.YT?.Player) {
    mountYouTubePlayer(state, options, videoId);
    return;
  }

  state.cancelPendingApiLoad = loadYouTubeIframeApi({
    onFailed: () => {
      state.cancelPendingApiLoad = null;
      options.onError?.("PLAYBACK_ERROR");
    },
    onLoaded: () => {
      state.cancelPendingApiLoad = null;
      mountYouTubePlayer(state, options, videoId);
    },
  });
}

function mountYouTubePlayer(
  state: AdapterState,
  options: CreateYouTubeVodPlayerAdapterOptions,
  videoId: string,
) {
  clearMountedPlayer(state);
  const YouTubePlayer = window.YT?.Player;
  if (!YouTubePlayer) {
    options.onError?.("PLAYBACK_ERROR");
    return;
  }

  const mountNode = createMountNode(options.container);
  state.activePlayer = new YouTubePlayer(mountNode, {
    events: createYouTubePlayerEvents(state, options),
    host: YOUTUBE_NOCOOKIE_HOST,
    playerVars: {
      controls: 1,
      enablejsapi: 1,
      origin: window.location.origin,
      playsinline: 1,
      rel: 0,
    },
    videoId,
  });
}

function createYouTubePlayerEvents(
  state: AdapterState,
  options: CreateYouTubeVodPlayerAdapterOptions,
): YouTubePlayerOptions["events"] {
  return {
    onAutoplayBlocked: () => {
      if (!state.isDestroyed) {
        options.onError?.("AUTOPLAY_BLOCKED");
      }
    },
    onError: (event) => {
      if (!state.isDestroyed) {
        options.onError?.(mapYouTubeErrorCode(event.data));
      }
    },
    onReady: (event) => {
      if (state.isDestroyed) {
        return;
      }
      const readyPlayer = event?.target ?? state.activePlayer;
      if (!readyPlayer) {
        return;
      }
      state.activePlayer = readyPlayer;
      state.readyPlayer = readyPlayer;
      flushPendingPlayerCommands(state, readyPlayer);
    },
    onStateChange: (event) => {
      if (state.isDestroyed) {
        return;
      }
      const normalized = mapYouTubePlayerState(event.data);
      if (normalized) {
        options.onStateChange?.(normalized);
      }
    },
  };
}

function flushPendingPlayerCommands(state: AdapterState, readyPlayer: YouTubePlayerInstance) {
  if (state.pendingSeekSec !== null) {
    readyPlayer.seekTo(state.pendingSeekSec, true);
    state.pendingSeekSec = null;
  }
  if (state.pendingPause) {
    readyPlayer.pauseVideo();
    state.pendingPause = false;
  }
}

function seekAdapter(state: AdapterState, timeSec: number) {
  if (state.isDestroyed) {
    return;
  }
  if (!state.readyPlayer) {
    state.pendingSeekSec = timeSec;
    return;
  }
  state.readyPlayer.seekTo(timeSec, true);
}

function pauseAdapter(state: AdapterState) {
  if (state.isDestroyed) {
    return;
  }
  if (!state.readyPlayer) {
    state.pendingPause = true;
    return;
  }
  state.readyPlayer.pauseVideo();
}

function playAdapter(state: AdapterState) {
  if (state.isDestroyed) {
    return;
  }
  state.pendingPause = false;
  state.readyPlayer?.playVideo();
}

function getAdapterCurrentTime(state: AdapterState): number {
  if (!state.readyPlayer) {
    return 0;
  }
  const timeSec = state.readyPlayer.getCurrentTime();
  return Number.isFinite(timeSec) ? Math.max(0, timeSec) : 0;
}

function destroyAdapter(state: AdapterState, container: HTMLElement) {
  if (state.isDestroyed) {
    return;
  }
  state.isDestroyed = true;
  state.pendingSeekSec = null;
  state.pendingPause = false;
  state.cancelPendingApiLoad?.();
  state.cancelPendingApiLoad = null;
  clearMountedPlayer(state);
  container.replaceChildren();
}

function clearMountedPlayer(state: AdapterState) {
  state.readyPlayer = null;
  state.activePlayer?.destroy();
  state.activePlayer = null;
}

function createMountNode(container: HTMLElement): HTMLDivElement {
  const mountNode = document.createElement("div");
  mountNode.className = "size-full";
  container.replaceChildren(mountNode);
  return mountNode;
}

function mapYouTubePlayerState(stateCode: number): VodPlayerState | null {
  switch (stateCode) {
    case YOUTUBE_STATE_PLAYING: {
      return "PLAYING";
    }
    case YOUTUBE_STATE_PAUSED: {
      return "PAUSED";
    }
    case YOUTUBE_STATE_ENDED: {
      return "ENDED";
    }
    default: {
      return null;
    }
  }
}

function mapYouTubeErrorCode(errorCode: number): VodPlayerErrorCode {
  switch (errorCode) {
    case YOUTUBE_ERROR_NOT_FOUND: {
      return "NOT_FOUND";
    }
    case YOUTUBE_ERROR_EMBED_DISABLED:
    case YOUTUBE_ERROR_EMBED_DISABLED_ALT: {
      return "EMBED_DISABLED";
    }
    default: {
      return "PLAYBACK_ERROR";
    }
  }
}

export {
  createYouTubeVodPlayerAdapter,
  type CreateYouTubeVodPlayerAdapterOptions,
  type VodPlayerAdapter,
  type VodPlayerErrorCode,
  type VodPlayerState,
};
