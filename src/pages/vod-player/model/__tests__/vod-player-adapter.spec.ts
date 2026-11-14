import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import {
  createYouTubeVodPlayerAdapter,
  type VodPlayerErrorCode,
  type VodPlayerState,
} from "../vod-player-adapter";

interface CapturedYouTubePlayerOptions {
  events?: {
    onAutoplayBlocked?: () => void;
    onError?: (event: { data: number }) => void;
    onReady?: () => void;
    onStateChange?: (event: { data: number }) => void;
  };
  host?: string;
  playerVars?: Record<string, string | number>;
  videoId: string;
}

function createFakeYouTubeEnvironment() {
  const calls: {
    element: HTMLElement | string;
    options: CapturedYouTubePlayerOptions;
  }[] = [];

  const playerInstance = {
    destroy: vi.fn<() => void>(),
    getCurrentTime: vi.fn<() => number>().mockReturnValue(0),
    pauseVideo: vi.fn<() => void>(),
    playVideo: vi.fn<() => void>(),
    seekTo: vi.fn<(seconds: number, allowSeekAhead: boolean) => void>(),
  };

  class FakeYouTubePlayer {
    public destroy = playerInstance.destroy;
    public getCurrentTime = playerInstance.getCurrentTime;
    public pauseVideo = playerInstance.pauseVideo;
    public playVideo = playerInstance.playVideo;
    public seekTo = playerInstance.seekTo;

    public constructor(element: HTMLElement | string, options: CapturedYouTubePlayerOptions) {
      calls.push({ element, options });
    }
  }

  return {
    calls,
    playerInstance,
    Player: FakeYouTubePlayer,
  };
}

function createHostContainer(): HTMLDivElement {
  const element = document.createElement("div");
  document.body.insertBefore(element, null);
  return element;
}

afterEach(() => {
  document.body.replaceChildren();
  delete window.YT;
  delete window.onYouTubeIframeAPIReady;
  for (const element of document.head.querySelectorAll(
    'script[src="https://www.youtube.com/iframe_api"]',
  )) {
    element.remove();
  }
  vi.restoreAllMocks();
});

describe("youtube vod player adapter", () => {
  it("mounts YT.Player into a child mount element using youtube-nocookie host and required playerVars", () => {
    expect.assertions(4);

    // Arrange
    const container = createHostContainer();
    const fakeEnv = createFakeYouTubeEnvironment();
    window.YT = { Player: fakeEnv.Player };
    const adapter = createYouTubeVodPlayerAdapter({ container });

    // Act
    adapter.load("Ha5QwBV3Rhk");
    const [call] = fakeEnv.calls;

    // Assert
    expect(fakeEnv.calls).toHaveLength(1);
    expect(call?.element).not.toBe(container);
    expect(container.contains(call?.element as HTMLElement)).toBe(true);
    expect(call?.options).toMatchObject({
      host: "https://www.youtube-nocookie.com",
      playerVars: {
        controls: 1,
        enablejsapi: 1,
        origin: window.location.origin,
        playsinline: 1,
        rel: 0,
      },
      videoId: "Ha5QwBV3Rhk",
    });
  });

  it("injects iframe_api script once, chains previous ready callback, and mounts after API ready", () => {
    expect.assertions(4);

    // Arrange
    const container = createHostContainer();
    const container2 = createHostContainer();
    const fakeEnv = createFakeYouTubeEnvironment();
    const previousReady = vi.fn<() => void>();
    window.onYouTubeIframeAPIReady = previousReady;
    const adapter1 = createYouTubeVodPlayerAdapter({ container });
    const adapter2 = createYouTubeVodPlayerAdapter({ container: container2 });

    // Act
    adapter1.load("Ha5QwBV3Rhk");
    adapter2.load("nkfn9HK66gg");
    const scripts = document.head.querySelectorAll(
      'script[src="https://www.youtube.com/iframe_api"]',
    );
    window.YT = { Player: fakeEnv.Player };
    window.onYouTubeIframeAPIReady();

    // Assert
    expect(scripts).toHaveLength(1);
    expect(previousReady).toHaveBeenCalledOnce();
    expect(fakeEnv.calls).toHaveLength(2);
    expect(fakeEnv.calls.map((call) => call.options.videoId)).toStrictEqual([
      "Ha5QwBV3Rhk",
      "nkfn9HK66gg",
    ]);
  });

  it("mounts only the latest videoId when load is called again before iframe_api resolves", () => {
    expect.assertions(2);

    // Arrange
    const container = createHostContainer();
    const fakeEnv = createFakeYouTubeEnvironment();
    const adapter = createYouTubeVodPlayerAdapter({ container });

    // Act
    adapter.load("Ha5QwBV3Rhk");
    adapter.load("w0iO_PuUxFs");
    window.YT = { Player: fakeEnv.Player };
    window.onYouTubeIframeAPIReady?.();

    // Assert
    expect(fakeEnv.calls).toHaveLength(1);
    expect(fakeEnv.calls[0]?.options.videoId).toBe("w0iO_PuUxFs");
  });

  it("emits PLAYBACK_ERROR when script fails to load or ready fires without window.YT.Player", () => {
    expect.assertions(3);

    // Arrange
    const container = createHostContainer();
    const errors: VodPlayerErrorCode[] = [];
    const adapter = createYouTubeVodPlayerAdapter({
      container,
      onError: (error) => {
        errors.push(error);
      },
    });

    // Act
    adapter.load("Ha5QwBV3Rhk");
    const script = document.head.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]',
    ) as HTMLScriptElement;
    script.dispatchEvent(new Event("error"));

    adapter.load("nkfn9HK66gg");
    window.onYouTubeIframeAPIReady?.();

    // Assert
    expect(errors).toStrictEqual(["PLAYBACK_ERROR", "PLAYBACK_ERROR"]);
    expect(
      document.head.querySelectorAll('script[src="https://www.youtube.com/iframe_api"]'),
    ).toHaveLength(1);
    expect(script.isConnected).toBe(false);
  });

  it("ignores play/pause and queues seekTo before onReady fires", () => {
    expect.assertions(5);

    // Arrange
    const container = createHostContainer();
    const fakeEnv = createFakeYouTubeEnvironment();
    window.YT = { Player: fakeEnv.Player };
    const adapter = createYouTubeVodPlayerAdapter({ container });

    // Act
    adapter.load("Ha5QwBV3Rhk");
    const timeBeforeReady = adapter.getCurrentTime();
    adapter.play();
    adapter.pause();
    adapter.seekTo(45);
    const [call] = fakeEnv.calls;

    // Assert before ready
    expect(timeBeforeReady).toBe(0);
    expect(fakeEnv.playerInstance.playVideo).not.toHaveBeenCalled();
    expect(fakeEnv.playerInstance.pauseVideo).not.toHaveBeenCalled();
    expect(fakeEnv.playerInstance.seekTo).not.toHaveBeenCalled();

    // Act ready
    call?.options.events?.onReady?.();
    expect(fakeEnv.playerInstance.seekTo).toHaveBeenCalledWith(45, true);
  });

  it("delegates play, pause, seekTo, and clamped getCurrentTime after onReady", () => {
    expect.assertions(4);

    // Arrange
    const container = createHostContainer();
    const fakeEnv = createFakeYouTubeEnvironment();
    window.YT = { Player: fakeEnv.Player };
    const adapter = createYouTubeVodPlayerAdapter({ container });
    adapter.load("Ha5QwBV3Rhk");
    fakeEnv.calls[0]?.options.events?.onReady?.();

    // Act
    fakeEnv.playerInstance.getCurrentTime.mockReturnValueOnce(48.5);
    const timeWhenReady = adapter.getCurrentTime();
    fakeEnv.playerInstance.getCurrentTime.mockReturnValueOnce(-3);
    const clampedNegativeTime = adapter.getCurrentTime();
    fakeEnv.playerInstance.getCurrentTime.mockReturnValueOnce(Number.NaN);
    const clampedNanTime = adapter.getCurrentTime();
    adapter.play();
    adapter.pause();
    adapter.seekTo(110);

    // Assert
    expect([timeWhenReady, clampedNegativeTime, clampedNanTime]).toStrictEqual([48.5, 0, 0]);
    expect(fakeEnv.playerInstance.playVideo).toHaveBeenCalledOnce();
    expect(fakeEnv.playerInstance.pauseVideo).toHaveBeenCalledOnce();
    expect(fakeEnv.playerInstance.seekTo).toHaveBeenCalledWith(110, true);
  });

  it("destroys previous YT.Player when load is called again with a new videoId", () => {
    expect.assertions(3);

    // Arrange
    const container = createHostContainer();
    const fakeEnv = createFakeYouTubeEnvironment();
    window.YT = { Player: fakeEnv.Player };
    const adapter = createYouTubeVodPlayerAdapter({ container });
    adapter.load("Ha5QwBV3Rhk");
    fakeEnv.calls[0]?.options.events?.onReady?.();

    // Act
    adapter.load("nkfn9HK66gg");

    // Assert
    expect(fakeEnv.playerInstance.destroy).toHaveBeenCalledOnce();
    expect(fakeEnv.calls).toHaveLength(2);
    expect(fakeEnv.calls[1]?.options.videoId).toBe("nkfn9HK66gg");
  });

  it("normalizes YouTube state changes to PLAYING, PAUSED, and ENDED while ignoring transient states", () => {
    expect.assertions(1);

    // Arrange
    const container = createHostContainer();
    const fakeEnv = createFakeYouTubeEnvironment();
    window.YT = { Player: fakeEnv.Player };
    const states: VodPlayerState[] = [];
    const adapter = createYouTubeVodPlayerAdapter({
      container,
      onStateChange: (state) => {
        states.push(state);
      },
    });
    adapter.load("Ha5QwBV3Rhk");
    const onStateChange = fakeEnv.calls[0]?.options.events?.onStateChange;

    // Act
    onStateChange?.({ data: -1 });
    onStateChange?.({ data: 3 });
    onStateChange?.({ data: 5 });
    onStateChange?.({ data: 1 });
    onStateChange?.({ data: 2 });
    onStateChange?.({ data: 0 });

    // Assert
    expect(states).toStrictEqual(["PLAYING", "PAUSED", "ENDED"]);
  });

  it("normalizes YouTube errors and autoplay blocked events", () => {
    expect.assertions(1);

    // Arrange
    const container = createHostContainer();
    const fakeEnv = createFakeYouTubeEnvironment();
    window.YT = { Player: fakeEnv.Player };
    const errors: VodPlayerErrorCode[] = [];
    const adapter = createYouTubeVodPlayerAdapter({
      container,
      onError: (error) => {
        errors.push(error);
      },
    });
    adapter.load("Ha5QwBV3Rhk");
    const events = fakeEnv.calls[0]?.options.events;

    // Act
    events?.onError?.({ data: 100 });
    events?.onError?.({ data: 101 });
    events?.onError?.({ data: 150 });
    events?.onError?.({ data: 2 });
    events?.onError?.({ data: 5 });
    events?.onAutoplayBlocked?.();

    // Assert
    expect(errors).toStrictEqual([
      "NOT_FOUND",
      "EMBED_DISABLED",
      "EMBED_DISABLED",
      "PLAYBACK_ERROR",
      "PLAYBACK_ERROR",
      "AUTOPLAY_BLOCKED",
    ]);
  });

  it("destroys player and clears container while ignoring duplicate destroy and subsequent load/seek/play/pause", () => {
    expect.assertions(4);

    // Arrange
    const container = createHostContainer();
    const fakeEnv = createFakeYouTubeEnvironment();
    window.YT = { Player: fakeEnv.Player };
    const adapter = createYouTubeVodPlayerAdapter({ container });
    adapter.load("Ha5QwBV3Rhk");

    // Act
    adapter.destroy();
    adapter.destroy();
    adapter.load("nkfn9HK66gg");
    adapter.seekTo(30);
    adapter.play();
    adapter.pause();

    // Assert
    expect(fakeEnv.playerInstance.destroy).toHaveBeenCalledOnce();
    expect(container.childElementCount).toBe(0);
    expect(fakeEnv.calls).toHaveLength(1);
    expect(adapter.getCurrentTime()).toBe(0);
  });

  it("suppresses late YT.Player callbacks after destroy", () => {
    expect.assertions(2);

    // Arrange
    const container = createHostContainer();
    const fakeEnv = createFakeYouTubeEnvironment();
    window.YT = { Player: fakeEnv.Player };
    const states: VodPlayerState[] = [];
    const errors: VodPlayerErrorCode[] = [];
    const adapter = createYouTubeVodPlayerAdapter({
      container,
      onError: (error) => {
        errors.push(error);
      },
      onStateChange: (state) => {
        states.push(state);
      },
    });
    adapter.load("Ha5QwBV3Rhk");
    const events = fakeEnv.calls[0]?.options.events;

    // Act
    adapter.destroy();
    events?.onReady?.();
    events?.onStateChange?.({ data: 1 });
    events?.onError?.({ data: 100 });
    events?.onAutoplayBlocked?.();

    // Assert
    expect(states).toStrictEqual([]);
    expect(errors).toStrictEqual([]);
  });

  it("cancels pending iframe_api load cleanly if destroyed before script finishes loading", () => {
    expect.assertions(3);

    // Arrange
    const container = createHostContainer();
    const fakeEnv = createFakeYouTubeEnvironment();
    const errors: VodPlayerErrorCode[] = [];
    const adapter = createYouTubeVodPlayerAdapter({
      container,
      onError: (error) => {
        errors.push(error);
      },
    });
    adapter.load("Ha5QwBV3Rhk");
    const script = document.head.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]',
    ) as HTMLScriptElement;

    // Act
    adapter.destroy();
    window.YT = { Player: fakeEnv.Player };
    window.onYouTubeIframeAPIReady?.();
    script.dispatchEvent(new Event("error"));

    // Assert
    expect(fakeEnv.calls).toHaveLength(0);
    expect(errors).toStrictEqual([]);
    expect(script.isConnected).toBe(true);
  });

  it("ignores events safely when optional onStateChange and onError callbacks are omitted", () => {
    expect.assertions(1);

    // Arrange
    const container = createHostContainer();
    const fakeEnv = createFakeYouTubeEnvironment();
    window.YT = { Player: fakeEnv.Player };
    const adapter = createYouTubeVodPlayerAdapter({ container });
    adapter.load("Ha5QwBV3Rhk");
    const events = fakeEnv.calls[0]?.options.events;

    // Act
    events?.onStateChange?.({ data: 1 });
    events?.onError?.({ data: 100 });
    events?.onAutoplayBlocked?.();
    adapter.destroy();
    window.YT = undefined;
    const adapterWithoutApi = createYouTubeVodPlayerAdapter({ container });
    adapterWithoutApi.load("nkfn9HK66gg");
    window.onYouTubeIframeAPIReady?.();

    // Assert
    expect(fakeEnv.calls).toHaveLength(1);
  });
});
