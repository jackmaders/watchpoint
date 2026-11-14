import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { TEST_VOD_CHECKPOINTS } from "@test/vitest/fixtures/vods";

import { createCheckpointPoller, findCrossedCheckpoint } from "../checkpoint-poller";

function createRafHarness() {
  let nextFrameId = 1;
  const queuedFrames = new Map<number, FrameRequestCallback>();

  const requestSpy = vi
    .spyOn(window, "requestAnimationFrame")
    .mockImplementation((frameHandler) => {
      const frameId = nextFrameId;
      nextFrameId += 1;
      queuedFrames.set(frameId, frameHandler);
      return frameId;
    });

  const cancelSpy = vi.spyOn(window, "cancelAnimationFrame").mockImplementation((frameId) => {
    queuedFrames.delete(frameId);
  });

  function flushNextFrame(timestamp = 16) {
    const nextEntry = queuedFrames.entries().next();
    if (nextEntry.done === true) {
      throw new Error("No animation frame queued");
    }
    const [frameId, frameHandler] = nextEntry.value;
    queuedFrames.delete(frameId);
    frameHandler(timestamp);
  }

  return {
    cancelSpy,
    flushNextFrame,
    queuedFrames,
    requestSpy,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("checkpoint crossing detection", () => {
  it("returns the crossed unanswered checkpoint when prevTime < timeSec <= currentTime", () => {
    expect.assertions(2);

    // Arrange
    const answeredCheckpointIds = new Set<string>();

    // Act
    const exactMatch = findCrossedCheckpoint({
      answeredCheckpointIds,
      checkpoints: TEST_VOD_CHECKPOINTS,
      currentTimeSec: 45,
      previousTimeSec: 44.9,
    });
    const overshootMatch = findCrossedCheckpoint({
      answeredCheckpointIds,
      checkpoints: TEST_VOD_CHECKPOINTS,
      currentTimeSec: 112,
      previousTimeSec: 109.5,
    });

    // Assert
    expect(exactMatch?.id).toBe("shu-ana-owcs-kr-s3-cp-1");
    expect(overshootMatch?.id).toBe("shu-ana-owcs-kr-s3-cp-2");
  });

  it("returns null before reaching a checkpoint, when already past it, or when scrubbing backward", () => {
    expect.assertions(3);

    // Arrange
    const answeredCheckpointIds = new Set<string>();

    // Act
    const beforeFirst = findCrossedCheckpoint({
      answeredCheckpointIds,
      checkpoints: TEST_VOD_CHECKPOINTS,
      currentTimeSec: 44.99,
      previousTimeSec: 0,
    });
    const alreadyPast = findCrossedCheckpoint({
      answeredCheckpointIds,
      checkpoints: TEST_VOD_CHECKPOINTS,
      currentTimeSec: 46,
      previousTimeSec: 45,
    });
    const scrubbedBackward = findCrossedCheckpoint({
      answeredCheckpointIds,
      checkpoints: TEST_VOD_CHECKPOINTS,
      currentTimeSec: 20,
      previousTimeSec: 80,
    });

    // Assert
    expect(beforeFirst).toBeNull();
    expect(alreadyPast).toBeNull();
    expect(scrubbedBackward).toBeNull();
  });

  it("ignores already-answered checkpoints and returns the next unanswered crossed checkpoint", () => {
    expect.assertions(2);

    // Arrange
    const answeredCheckpointIds = new Set<string>(["shu-ana-owcs-kr-s3-cp-1"]);

    // Act
    const skippedSingle = findCrossedCheckpoint({
      answeredCheckpointIds,
      checkpoints: TEST_VOD_CHECKPOINTS,
      currentTimeSec: 50,
      previousTimeSec: 40,
    });
    const skippedFirstFoundSecond = findCrossedCheckpoint({
      answeredCheckpointIds,
      checkpoints: TEST_VOD_CHECKPOINTS,
      currentTimeSec: 120,
      previousTimeSec: 40,
    });

    // Assert
    expect(skippedSingle).toBeNull();
    expect(skippedFirstFoundSecond?.id).toBe("shu-ana-owcs-kr-s3-cp-2");
  });
});

describe("checkpoint polling engine", () => {
  it("runs requestAnimationFrame loop only while PLAYING and cancels on PAUSED, ENDED, or stop", () => {
    expect.assertions(5);

    // Arrange
    const raf = createRafHarness();
    let currentTimeSec = 10;
    const onCheckpointCrossed = vi.fn<() => void>();
    const poller = createCheckpointPoller({
      getAnsweredCheckpointIds: () => new Set<string>(),
      getCheckpoints: () => TEST_VOD_CHECKPOINTS,
      getCurrentTime: () => currentTimeSec,
      onCheckpointCrossed,
    });

    // Act
    poller.stop();
    poller.handlePlayerStateChange("PAUSED");
    poller.handlePlayerStateChange("PLAYING");
    poller.handlePlayerStateChange("PLAYING");
    const queuedWhilePlaying = raf.queuedFrames.size;

    currentTimeSec = 20;
    raf.flushNextFrame();
    poller.handlePlayerStateChange("PAUSED");
    const queuedAfterPaused = raf.queuedFrames.size;

    poller.handlePlayerStateChange("PLAYING");
    poller.handlePlayerStateChange("ENDED");
    const queuedAfterEnded = raf.queuedFrames.size;

    // Assert
    expect(raf.requestSpy).toHaveBeenCalledTimes(3);
    expect(raf.cancelSpy).toHaveBeenCalledTimes(2);
    expect(queuedWhilePlaying).toBe(1);
    expect([queuedAfterPaused, queuedAfterEnded]).toStrictEqual([0, 0]);
    expect(onCheckpointCrossed).not.toHaveBeenCalled();
  });

  it("triggers onCheckpointCrossed and stops polling when crossing an unanswered checkpoint", () => {
    expect.assertions(4);

    // Arrange
    const raf = createRafHarness();
    let currentTimeSec = 44.5;
    const crossedIds: string[] = [];
    const poller = createCheckpointPoller({
      getAnsweredCheckpointIds: () => new Set<string>(),
      getCheckpoints: () => TEST_VOD_CHECKPOINTS,
      getCurrentTime: () => currentTimeSec,
      onCheckpointCrossed: (checkpoint) => {
        crossedIds.push(checkpoint.id);
      },
    });

    // Act
    poller.handlePlayerStateChange("PLAYING");
    raf.flushNextFrame();
    currentTimeSec = 45.2;
    raf.flushNextFrame();
    const queuedAfterHit = raf.queuedFrames.size;

    // Resuming from 45.2 should not re-trigger the 45s checkpoint
    poller.handlePlayerStateChange("PLAYING");
    currentTimeSec = 46;
    raf.flushNextFrame();

    // Assert
    expect(crossedIds).toStrictEqual(["shu-ana-owcs-kr-s3-cp-1"]);
    expect(queuedAfterHit).toBe(0);
    expect(raf.queuedFrames.size).toBe(1);
    expect(raf.requestSpy).toHaveBeenCalledTimes(4);
  });

  it("ignores answered checkpoints during passive playback", () => {
    expect.assertions(2);

    // Arrange
    const raf = createRafHarness();
    let currentTimeSec = 40;
    const answered = new Set<string>(["shu-ana-owcs-kr-s3-cp-1"]);
    const crossedIds: string[] = [];
    const poller = createCheckpointPoller({
      getAnsweredCheckpointIds: () => answered,
      getCheckpoints: () => TEST_VOD_CHECKPOINTS,
      getCurrentTime: () => currentTimeSec,
      onCheckpointCrossed: (checkpoint) => {
        crossedIds.push(checkpoint.id);
      },
    });

    // Act
    poller.handlePlayerStateChange("PLAYING");
    raf.flushNextFrame();
    currentTimeSec = 50;
    raf.flushNextFrame();
    currentTimeSec = 110;
    raf.flushNextFrame();

    // Assert
    expect(crossedIds).toStrictEqual(["shu-ana-owcs-kr-s3-cp-2"]);
    expect(raf.queuedFrames.size).toBe(0);
  });

  it("syncTime updates previousTimeSec so pill jumps do not falsely trigger earlier or target checkpoints", () => {
    expect.assertions(2);

    // Arrange
    const raf = createRafHarness();
    let currentTimeSec = 10;
    const crossedIds: string[] = [];
    const poller = createCheckpointPoller({
      getAnsweredCheckpointIds: () => new Set<string>(),
      getCheckpoints: () => TEST_VOD_CHECKPOINTS,
      getCurrentTime: () => currentTimeSec,
      onCheckpointCrossed: (checkpoint) => {
        crossedIds.push(checkpoint.id);
      },
    });

    // Act: simulate playing to 10s, then jumping to checkpoint 2 (110s)
    poller.handlePlayerStateChange("PLAYING");
    raf.flushNextFrame();
    poller.stop();
    currentTimeSec = 110;
    poller.syncTime(110);

    poller.handlePlayerStateChange("PLAYING");
    currentTimeSec = 110.5;
    raf.flushNextFrame();
    const crossedImmediatelyAfterSeek = [...crossedIds];

    currentTimeSec = 185;
    raf.flushNextFrame();

    // Assert
    expect(crossedImmediatelyAfterSeek).toStrictEqual([]);
    expect(crossedIds).toStrictEqual(["shu-ana-owcs-kr-s3-cp-3"]);
  });
});
