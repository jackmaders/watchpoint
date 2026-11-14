import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Suspense } from "react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import {
  createVodDetailFixture,
  TEST_VOD_CHECKPOINTS,
  TEST_VOD_DETAIL,
} from "@test/vitest/fixtures/vods";
import { renderWithProviders } from "@test/vitest/wrappers/testing-wrapper";

import { getVodDetailFn } from "../../api/vod-player.functions";
import type { VodCheckpoint } from "../../model/vod-detail";
import {
  createYouTubeVodPlayerAdapter,
  type CreateYouTubeVodPlayerAdapterOptions,
} from "../../model/vod-player-adapter";
import { VodPlayerPage } from "../vod-player-page";

vi.mock(import("../../api/vod-player.functions"));
vi.mock(import("../../model/vod-player-adapter"));

function requireCheckpoint(index: number): VodCheckpoint {
  const checkpoint = TEST_VOD_CHECKPOINTS.at(index);
  if (!checkpoint) {
    throw new Error(`Missing test checkpoint at index ${index}`);
  }
  return checkpoint;
}

function requireOption(checkpoint: VodCheckpoint, index: number): string {
  const option = checkpoint.options.at(index);
  if (option === undefined) {
    throw new Error(`Missing option at index ${index}`);
  }
  return option;
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

  return { flushFrame };
}

async function mountVodPlayerPage() {
  renderWithProviders(
    <Suspense fallback={<p>Loading VOD</p>}>
      <VodPlayerPage vodId={TEST_VOD_DETAIL.id} />
    </Suspense>,
  );
  return await screen.findByRole("heading", { level: 1, name: TEST_VOD_DETAIL.title });
}

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("vod player page", () => {
  it("renders single title, 16:9 mount region without overlays, and loads videoId", async () => {
    expect.assertions(5);

    // Arrange
    const { adapter } = setupMockAdapter();
    vi.mocked(getVodDetailFn).mockResolvedValueOnce(TEST_VOD_DETAIL);

    // Act
    const heading = await mountVodPlayerPage();
    const playerRegion = screen.getByRole("region", { name: "VOD player" });
    const playerScope = within(playerRegion);

    // Assert
    expect(heading).toBeDefined();
    expect(playerRegion.className).toContain("aspect-video");
    expect(playerRegion.className).toContain("bg-black");
    expect(playerScope.queryByRole("button")).toBeNull();
    expect(adapter.load).toHaveBeenCalledWith(TEST_VOD_DETAIL.youtubeVideoId);
  });

  it("renders checkpoint pills formatted as MM:SS and idle prompt panel", async () => {
    expect.assertions(4);

    // Arrange
    setupMockAdapter();
    vi.mocked(getVodDetailFn).mockResolvedValueOnce(TEST_VOD_DETAIL);

    // Act
    const heading = await mountVodPlayerPage();
    const playerScope = within(screen.getByRole("region", { name: "VOD player" }));
    const checkpointGroup = screen.getByRole("group", { name: "Checkpoints" });
    const pillButtons = within(checkpointGroup).getAllByRole("button");
    const promptPanel = screen.getByRole("complementary", { name: "Checkpoint prompt" });

    // Assert
    expect(heading).toBeDefined();
    expect(playerScope.queryByText(/./u)).toBeNull();
    expect(pillButtons.map((button) => button.textContent)).toStrictEqual([
      "00:45",
      "01:50",
      "03:05",
      "04:20",
    ]);
    expect(
      within(promptPanel).getByText(
        "Play the video. Playback pauses automatically at each Checkpoint.",
      ),
    ).toBeDefined();
  });

  it("omits checkpoint pill strip when vod has no checkpoints", async () => {
    expect.assertions(2);

    // Arrange
    setupMockAdapter();
    vi.mocked(getVodDetailFn).mockResolvedValueOnce(createVodDetailFixture({ checkpoints: [] }));

    // Act
    const heading = await mountVodPlayerPage();
    const checkpointGroup = screen.queryByRole("group", { name: "Checkpoints" });

    // Assert
    expect(heading).toBeDefined();
    expect(checkpointGroup).toBeNull();
  });

  it("auto-pauses playback and displays the crossed checkpoint prompt during PLAYING polling", async () => {
    expect.assertions(5);

    // Arrange
    const raf = createRafController();
    const { adapter, getOptions } = setupMockAdapter();
    const firstCheckpoint = requireCheckpoint(0);
    vi.mocked(getVodDetailFn).mockResolvedValueOnce(TEST_VOD_DETAIL);
    await mountVodPlayerPage();
    let currentTimeSec = 10;
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
    const promptPanel = screen.getByRole("complementary", { name: "Checkpoint prompt" });
    const promptScope = within(promptPanel);
    const optionButtons = within(
      promptScope.getByRole("group", { name: "Prompt options" }),
    ).getAllByRole("button");

    // Assert
    expect(adapter.pause).toHaveBeenCalledOnce();
    expect(promptScope.getByText(firstCheckpoint.skillCategory)).toBeDefined();
    expect(promptScope.getByText("00:45")).toBeDefined();
    expect(promptScope.getByText(firstCheckpoint.question)).toBeDefined();
    expect(optionButtons.map((button) => button.textContent)).toStrictEqual(
      firstCheckpoint.options,
    );
  });

  it("seeks, pauses, and opens the clicked checkpoint in the prompt panel", async () => {
    expect.assertions(5);

    // Arrange
    const user = userEvent.setup();
    const { adapter } = setupMockAdapter();
    const secondCheckpoint = requireCheckpoint(1);
    vi.mocked(getVodDetailFn).mockResolvedValueOnce(TEST_VOD_DETAIL);
    await mountVodPlayerPage();
    const pillButton = screen.getByRole("button", { name: "01:50" });

    // Act
    await user.click(pillButton);
    const promptPanel = screen.getByRole("complementary", { name: "Checkpoint prompt" });
    const promptScope = within(promptPanel);

    // Assert
    expect(adapter.seekTo).toHaveBeenCalledWith(secondCheckpoint.timeSec);
    expect(adapter.pause).toHaveBeenCalledOnce();
    expect(pillButton.getAttribute("aria-pressed")).toBe("true");
    expect(promptScope.getByText(secondCheckpoint.skillCategory)).toBeDefined();
    expect(promptScope.getByText(secondCheckpoint.question)).toBeDefined();
  });

  it("supports single-select option buttons and clears selection when switching checkpoints", async () => {
    expect.assertions(5);

    // Arrange
    const user = userEvent.setup();
    setupMockAdapter();
    const firstCheckpoint = requireCheckpoint(0);
    const secondCheckpoint = requireCheckpoint(1);
    vi.mocked(getVodDetailFn).mockResolvedValueOnce(TEST_VOD_DETAIL);
    await mountVodPlayerPage();

    // Act
    await user.click(screen.getByRole("button", { name: "00:45" }));
    const firstOption = screen.getByRole("button", { name: requireOption(firstCheckpoint, 0) });
    const secondOption = screen.getByRole("button", { name: requireOption(firstCheckpoint, 1) });
    await user.click(firstOption);
    const firstPressedAfterFirstClick = firstOption.getAttribute("aria-pressed");
    await user.click(secondOption);
    const firstPressedAfterSecondClick = firstOption.getAttribute("aria-pressed");
    const secondPressedAfterSecondClick = secondOption.getAttribute("aria-pressed");

    await user.click(screen.getByRole("button", { name: "01:50" }));
    const nextCheckpointFirstOption = screen.getByRole("button", {
      name: requireOption(secondCheckpoint, 0),
    });

    // Assert
    expect(firstPressedAfterFirstClick).toBe("true");
    expect(firstPressedAfterSecondClick).toBe("false");
    expect(secondPressedAfterSecondClick).toBe("true");
    expect(nextCheckpointFirstOption.getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByRole("button", { name: "00:45" }).getAttribute("aria-pressed")).toBe(
      "false",
    );
  });
});
