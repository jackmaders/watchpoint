import { act, render, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { TEST_VOD_CHECKPOINTS, TEST_VOD_DETAIL } from "@test/vitest/fixtures/vods";

import {
  useVodPlayerSession,
  type UseVodPlayerSessionInput,
  type VodPlayerSessionState,
} from "../use-vod-player-session";
import type { VodCheckpoint } from "../vod-detail";
import {
  createYouTubeVodPlayerAdapter,
  type CreateYouTubeVodPlayerAdapterOptions,
} from "../vod-player-adapter";

vi.mock(import("../vod-player-adapter"));

function requireCheckpoint(index: number): VodCheckpoint {
  const checkpoint = TEST_VOD_CHECKPOINTS.at(index);
  if (!checkpoint) {
    throw new Error(`Missing test checkpoint at index ${index}`);
  }
  return checkpoint;
}

function setupMockAdapter() {
  let capturedOptions: CreateYouTubeVodPlayerAdapterOptions | null = null;
  const adapter = {
    destroy: vi.fn<() => void>(),
    getCurrentTime: vi.fn<() => number>(() => 0),
    load: vi.fn<(videoId: string) => void>(),
    pause: vi.fn<() => void>(),
    play: vi.fn<() => void>(),
    seekTo: vi.fn<(timeSec: number) => void>(),
  };

  vi.mocked(createYouTubeVodPlayerAdapter).mockImplementation((options) => {
    capturedOptions = options;
    return adapter;
  });

  return {
    adapter,
    getOptions: () => {
      if (!capturedOptions) {
        throw new Error("Expected adapter options to be captured");
      }
      return capturedOptions;
    },
  };
}

function createRafController() {
  let nextId = 1;
  const frames = new Map<number, FrameRequestCallback>();

  vi.spyOn(window, "requestAnimationFrame").mockImplementation((frameHandler) => {
    const id = nextId;
    nextId += 1;
    frames.set(id, frameHandler);
    return id;
  });

  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
    frames.delete(id);
  });

  function flushFrame() {
    const nextEntry = frames.entries().next();
    if (nextEntry.done === true) {
      throw new Error("No animation frame queued");
    }
    const [frameId, frameHandler] = nextEntry.value;
    frames.delete(frameId);
    frameHandler(16);
  }

  return {
    flushFrame,
    frames,
  };
}

function createMountedSessionHarness(initialProps: UseVodPlayerSessionInput) {
  let currentSession: VodPlayerSessionState | null = null;

  function Harness(props: UseVodPlayerSessionInput) {
    currentSession = useVodPlayerSession(props);
    return <div ref={currentSession.playerHostRef} />;
  }

  const { unmount } = render(<Harness {...initialProps} />);

  return {
    getSession: () => {
      if (!currentSession) {
        throw new Error("Harness did not render");
      }
      return currentSession;
    },
    unmount,
  };
}

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("vod player session hook", () => {
  it("skips adapter creation when playerHostRef is unattached and still updates selected checkpoint", () => {
    expect.assertions(2);

    // Arrange
    const firstCheckpoint = requireCheckpoint(0);
    const { result } = renderHook(() =>
      useVodPlayerSession({
        checkpoints: TEST_VOD_CHECKPOINTS,
        youtubeVideoId: TEST_VOD_DETAIL.youtubeVideoId,
      }),
    );

    // Act
    act(() => {
      result.current.selectCheckpoint(firstCheckpoint);
    });

    // Assert
    expect(createYouTubeVodPlayerAdapter).not.toHaveBeenCalled();
    expect(result.current.activeCheckpoint?.id).toBe(firstCheckpoint.id);
  });

  it("mounts adapter, loads videoId, and destroys adapter on unmount", () => {
    expect.assertions(4);

    // Arrange
    const { adapter } = setupMockAdapter();
    const harness = createMountedSessionHarness({
      checkpoints: TEST_VOD_CHECKPOINTS,
      youtubeVideoId: TEST_VOD_DETAIL.youtubeVideoId,
    });

    // Act
    harness.unmount();

    // Assert
    expect(createYouTubeVodPlayerAdapter).toHaveBeenCalledOnce();
    expect(adapter.load).toHaveBeenCalledWith(TEST_VOD_DETAIL.youtubeVideoId);
    expect(adapter.destroy).toHaveBeenCalledOnce();
    expect(harness.getSession().activeCheckpoint).toBeNull();
  });

  it("auto-pauses and activates crossed checkpoint during PLAYING polling", () => {
    expect.assertions(4);

    // Arrange
    const raf = createRafController();
    const { adapter, getOptions } = setupMockAdapter();
    const firstCheckpoint = requireCheckpoint(0);
    const harness = createMountedSessionHarness({
      checkpoints: TEST_VOD_CHECKPOINTS,
      youtubeVideoId: TEST_VOD_DETAIL.youtubeVideoId,
    });
    let currentTimeSec = 20;
    adapter.getCurrentTime.mockImplementation(() => currentTimeSec);

    // Act
    act(() => {
      getOptions().onStateChange?.("PLAYING");
      raf.flushFrame();
    });
    currentTimeSec = firstCheckpoint.timeSec;
    act(() => {
      raf.flushFrame();
    });

    // Assert
    expect(adapter.pause).toHaveBeenCalledOnce();
    expect(harness.getSession().activeCheckpoint?.id).toBe(firstCheckpoint.id);
    expect(harness.getSession().activeAnswer).toBeNull();
    expect(raf.frames.size).toBe(0);
  });

  it("seeks, pauses, updates checkpoint selection, and exposes null activeAnswer on an unanswered checkpoint", () => {
    expect.assertions(5);

    // Arrange
    const { adapter } = setupMockAdapter();
    const firstCheckpoint = requireCheckpoint(0);
    const targetCheckpoint = requireCheckpoint(1);
    const harness = createMountedSessionHarness({
      checkpoints: TEST_VOD_CHECKPOINTS,
      youtubeVideoId: TEST_VOD_DETAIL.youtubeVideoId,
    });

    // Act
    act(() => {
      harness.getSession().selectCheckpoint(firstCheckpoint);
      harness.getSession().selectOption(2);
    });
    const firstAnswer = harness.getSession().activeAnswer;
    act(() => {
      harness.getSession().selectCheckpoint(targetCheckpoint);
    });

    // Assert
    expect(firstAnswer).toStrictEqual({ isCorrect: false, selectedOptionIndex: 2 });
    expect(adapter.seekTo).toHaveBeenLastCalledWith(targetCheckpoint.timeSec);
    expect(adapter.pause).toHaveBeenCalledTimes(2);
    expect(harness.getSession().activeCheckpoint?.id).toBe(targetCheckpoint.id);
    expect(harness.getSession().activeAnswer).toBeNull();
  });

  it("immediately records graded answers, locks duplicate clicks, and ignores idle selectOption", () => {
    expect.assertions(4);

    // Arrange
    setupMockAdapter();
    const firstCheckpoint = requireCheckpoint(0);
    const harness = createMountedSessionHarness({
      checkpoints: TEST_VOD_CHECKPOINTS,
      youtubeVideoId: TEST_VOD_DETAIL.youtubeVideoId,
    });

    // Act
    act(() => {
      harness.getSession().selectOption(0);
    });
    const answersAfterIdleSelect = harness.getSession().answers.size;
    act(() => {
      harness.getSession().selectCheckpoint(firstCheckpoint);
    });
    act(() => {
      harness.getSession().selectOption(firstCheckpoint.correctOptionIndex);
    });
    act(() => {
      harness.getSession().selectOption(0);
    });

    // Assert
    expect(answersAfterIdleSelect).toBe(0);
    expect(harness.getSession().activeAnswer).toStrictEqual({
      isCorrect: true,
      selectedOptionIndex: firstCheckpoint.correctOptionIndex,
    });
    expect(harness.getSession().answers.get(firstCheckpoint.id)).toStrictEqual({
      isCorrect: true,
      selectedOptionIndex: firstCheckpoint.correctOptionIndex,
    });
    expect(harness.getSession().answers.size).toBe(1);
  });

  it("clears activeCheckpoint and calls play on resumeVod even when AUTOPLAY_BLOCKED fires", () => {
    expect.assertions(5);

    // Arrange
    const { adapter, getOptions } = setupMockAdapter();
    const firstCheckpoint = requireCheckpoint(0);
    const harness = createMountedSessionHarness({
      checkpoints: TEST_VOD_CHECKPOINTS,
      youtubeVideoId: TEST_VOD_DETAIL.youtubeVideoId,
    });
    adapter.play.mockImplementationOnce(() => {
      getOptions().onError?.("AUTOPLAY_BLOCKED");
    });

    // Act
    act(() => {
      harness.getSession().selectCheckpoint(firstCheckpoint);
      harness.getSession().selectOption(firstCheckpoint.correctOptionIndex);
    });
    act(() => {
      harness.getSession().resumeVod();
    });

    // Assert
    expect(adapter.play).toHaveBeenCalledOnce();
    expect(harness.getSession().activeCheckpoint).toBeNull();
    expect(harness.getSession().activeAnswer).toBeNull();
    expect(harness.getSession().answers.size).toBe(1);
    expect(harness.getSession().playerError).toBeNull();
  });

  it("handles resumeVod and resetSession safely when playerHostRef is unattached", () => {
    expect.assertions(3);

    // Arrange
    const firstCheckpoint = requireCheckpoint(0);
    const { result } = renderHook(() =>
      useVodPlayerSession({
        checkpoints: TEST_VOD_CHECKPOINTS,
        youtubeVideoId: TEST_VOD_DETAIL.youtubeVideoId,
      }),
    );

    // Act
    act(() => {
      result.current.selectCheckpoint(firstCheckpoint);
    });
    act(() => {
      result.current.selectOption(0);
    });
    act(() => {
      result.current.resumeVod();
      result.current.resetSession();
    });

    // Assert
    expect(createYouTubeVodPlayerAdapter).not.toHaveBeenCalled();
    expect(result.current.activeCheckpoint).toBeNull();
    expect(result.current.answers.size).toBe(0);
  });

  it("skips answered checkpoints during passive playback and reopens them in review mode", () => {
    expect.assertions(5);

    // Arrange
    const raf = createRafController();
    const { adapter, getOptions } = setupMockAdapter();
    const firstCheckpoint = requireCheckpoint(0);
    const secondCheckpoint = requireCheckpoint(1);
    const harness = createMountedSessionHarness({
      checkpoints: TEST_VOD_CHECKPOINTS,
      youtubeVideoId: TEST_VOD_DETAIL.youtubeVideoId,
    });
    let currentTimeSec = 10;
    adapter.getCurrentTime.mockImplementation(() => currentTimeSec);

    // Act: cross and answer checkpoint 1, then scrub back and play across both checkpoint 1 and 2
    act(() => {
      getOptions().onStateChange?.("PLAYING");
      raf.flushFrame();
    });
    currentTimeSec = firstCheckpoint.timeSec;
    act(() => {
      raf.flushFrame();
    });
    act(() => {
      harness.getSession().selectOption(firstCheckpoint.correctOptionIndex);
    });
    act(() => {
      harness.getSession().resumeVod();
    });
    currentTimeSec = 20;
    act(() => {
      getOptions().onStateChange?.("PLAYING");
      raf.flushFrame();
    });
    currentTimeSec = firstCheckpoint.timeSec + 5;
    act(() => {
      raf.flushFrame();
    });
    const activeAfterSkippingFirst = harness.getSession().activeCheckpoint;
    currentTimeSec = secondCheckpoint.timeSec;
    act(() => {
      raf.flushFrame();
    });
    const activeAtSecond = harness.getSession().activeCheckpoint;

    // Act: reopen checkpoint 1 in review mode
    act(() => {
      harness.getSession().selectCheckpoint(firstCheckpoint);
    });

    // Assert
    expect(activeAfterSkippingFirst).toBeNull();
    expect(activeAtSecond?.id).toBe(secondCheckpoint.id);
    expect(harness.getSession().activeCheckpoint?.id).toBe(firstCheckpoint.id);
    expect(harness.getSession().activeAnswer).toStrictEqual({
      isCorrect: true,
      selectedOptionIndex: firstCheckpoint.correctOptionIndex,
    });
    expect(adapter.pause).toHaveBeenCalledTimes(3);
  });

  it("clears answers and re-enables checkpoint triggers on resetSession", () => {
    expect.assertions(4);

    // Arrange
    const raf = createRafController();
    const { adapter, getOptions } = setupMockAdapter();
    const firstCheckpoint = requireCheckpoint(0);
    const harness = createMountedSessionHarness({
      checkpoints: TEST_VOD_CHECKPOINTS,
      youtubeVideoId: TEST_VOD_DETAIL.youtubeVideoId,
    });
    let currentTimeSec = 10;
    adapter.getCurrentTime.mockImplementation(() => currentTimeSec);

    // Act
    act(() => {
      harness.getSession().selectCheckpoint(firstCheckpoint);
    });
    act(() => {
      harness.getSession().selectOption(0);
    });
    currentTimeSec = 10;
    act(() => {
      harness.getSession().resetSession();
    });
    const answersAfterReset = harness.getSession().answers.size;
    const activeAfterReset = harness.getSession().activeCheckpoint;
    act(() => {
      getOptions().onStateChange?.("PLAYING");
      raf.flushFrame();
    });
    currentTimeSec = firstCheckpoint.timeSec;
    act(() => {
      raf.flushFrame();
    });

    // Assert
    expect(answersAfterReset).toBe(0);
    expect(activeAfterReset).toBeNull();
    expect(harness.getSession().activeCheckpoint?.id).toBe(firstCheckpoint.id);
    expect(harness.getSession().activeAnswer).toBeNull();
  });

  it.each(["EMBED_DISABLED", "NOT_FOUND", "PLAYBACK_ERROR"] as const)(
    "records %s playerError, stops polling, destroys adapter, and keeps checkpoint selection safe",
    (errorCode) => {
      expect.assertions(5);

      // Arrange
      const raf = createRafController();
      const { adapter, getOptions } = setupMockAdapter();
      const firstCheckpoint = requireCheckpoint(0);
      const harness = createMountedSessionHarness({
        checkpoints: TEST_VOD_CHECKPOINTS,
        youtubeVideoId: TEST_VOD_DETAIL.youtubeVideoId,
      });

      // Act
      act(() => {
        getOptions().onStateChange?.("PLAYING");
        getOptions().onError?.(errorCode);
      });
      act(() => {
        harness.getSession().selectCheckpoint(firstCheckpoint);
      });

      // Assert
      expect(harness.getSession().playerError).toBe(errorCode);
      expect(raf.frames.size).toBe(0);
      expect(adapter.destroy).toHaveBeenCalledOnce();
      expect(adapter.seekTo).not.toHaveBeenCalled();
      expect(harness.getSession().activeCheckpoint?.id).toBe(firstCheckpoint.id);
    },
  );
});
