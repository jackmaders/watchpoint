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
import type { CheckpointAnswer } from "../../model/use-vod-player-session";
import type { VodCheckpoint } from "../../model/vod-detail";
import {
  createYouTubeVodPlayerAdapter,
  type CreateYouTubeVodPlayerAdapterOptions,
} from "../../model/vod-player-adapter";
import { VodPlayerPage } from "../vod-player-page";
import { VodPromptPanel } from "../vod-prompt-panel";

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
    expect.assertions(3);

    // Arrange
    setupMockAdapter();
    vi.mocked(getVodDetailFn).mockResolvedValueOnce(createVodDetailFixture({ checkpoints: [] }));

    // Act
    const heading = await mountVodPlayerPage();
    const checkpointGroup = screen.queryByRole("group", { name: "Checkpoints" });

    // Assert
    expect(heading).toBeDefined();
    expect(checkpointGroup).toBeNull();
    expect(screen.getByText("This VOD has no Checkpoints to review.")).toBeDefined();
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
    expect([
      promptScope.getByText(firstCheckpoint.question).textContent,
      screen.getByRole("status").textContent,
    ]).toStrictEqual([firstCheckpoint.question, `New Checkpoint: ${firstCheckpoint.question}`]);
    expect(optionButtons.map((button) => button.textContent)).toStrictEqual(
      firstCheckpoint.options,
    );
  });

  it("announces concise answer feedback and ignores repeat option selection", async () => {
    expect.assertions(2);

    // Arrange
    const raf = createRafController();
    const { adapter, getOptions } = setupMockAdapter();
    const firstCheckpoint = requireCheckpoint(0);
    const user = userEvent.setup();
    vi.mocked(getVodDetailFn).mockResolvedValueOnce(TEST_VOD_DETAIL);
    await mountVodPlayerPage();
    const announcement = screen.getByRole("status");
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
    const wrongOption = requireOption(firstCheckpoint, 0);
    const optionToClick = within(screen.getByRole("group", { name: "Prompt options" })).getByRole(
      "button",
      { name: wrongOption },
    );
    await user.click(optionToClick);
    const answerAnnouncement = announcement.textContent;
    await user.click(optionToClick);

    // Assert
    expect(answerAnnouncement).toContain("Incorrect answer.");
    expect(announcement.textContent).toContain("Review the correct answer and explanation.");
  });

  it("keeps malformed checkpoint answer indices readable", async () => {
    expect.assertions(2);

    // Arrange
    const raf = createRafController();
    const { adapter, getOptions } = setupMockAdapter();
    const firstCheckpoint = requireCheckpoint(0);
    const malformedCheckpoint = { ...firstCheckpoint, correctOptionIndex: 100 };
    vi.mocked(getVodDetailFn).mockResolvedValueOnce(
      createVodDetailFixture({
        checkpoints: [malformedCheckpoint, ...TEST_VOD_CHECKPOINTS.slice(1)],
      }),
    );
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
    const user = userEvent.setup();
    await user.click(
      within(screen.getByRole("group", { name: "Prompt options" })).getByRole("button", {
        name: requireOption(firstCheckpoint, 0),
      }),
    );
    const announcement = screen.getByRole("status").textContent;
    const promptPanel = screen.getByRole("complementary", { name: "Checkpoint prompt" });

    // Assert
    expect(announcement).toContain("Incorrect answer. Review the correct answer and explanation.");
    expect(promptPanel.textContent).toContain("Correct answer: Your answer:");
  });

  it("renders an empty selected answer when a stored option index is out of range", () => {
    expect.assertions(1);

    // Arrange
    const checkpoint = requireCheckpoint(0);
    const answer: CheckpointAnswer = { isCorrect: false, selectedOptionIndex: 100 };
    const onResetSession = vi.fn<() => void>();
    const onResumeVod = vi.fn<() => void>();
    const onSelectOption = vi.fn<(optionIndex: number) => void>();

    // Act
    renderWithProviders(
      <VodPromptPanel
        activeAnswer={answer}
        activeCheckpoint={checkpoint}
        correctCount={0}
        isSessionComplete={false}
        onResetSession={onResetSession}
        onResumeVod={onResumeVod}
        onSelectOption={onSelectOption}
        totalCheckpoints={TEST_VOD_CHECKPOINTS.length}
      />,
    );
    const promptPanel = screen.getByRole("complementary", { name: "Checkpoint prompt" });

    // Assert
    expect(promptPanel.textContent).toContain("Your answer: ");
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

  it("grades option immediately, locks options, and shows unselected options when switching to an unanswered checkpoint", async () => {
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
    const wrongOption = screen.getByRole("button", { name: requireOption(firstCheckpoint, 0) });
    const rightOption = screen.getByRole("button", {
      name: requireOption(firstCheckpoint, firstCheckpoint.correctOptionIndex),
    });
    await user.click(wrongOption);
    const wrongPressed = wrongOption.getAttribute("aria-pressed");
    const rightDisabledAfterAnswer = rightOption.getAttribute("aria-disabled");

    await user.click(screen.getByRole("button", { name: "01:50" }));
    const nextCheckpointFirstOption = screen.getByRole("button", {
      name: requireOption(secondCheckpoint, 0),
    });

    // Assert
    expect(wrongPressed).toBe("true");
    expect(rightDisabledAfterAnswer).toBe("true");
    expect(nextCheckpointFirstOption.getAttribute("aria-pressed")).toBe("false");
    expect((nextCheckpointFirstOption as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByRole("button", { name: "00:45 ✕" }).getAttribute("aria-pressed")).toBe(
      "false",
    );
  });

  it("reveals Correct feedback, coaching explanation, ✓ pill, and Resume VOD on correct selection", async () => {
    expect.assertions(5);

    // Arrange
    const user = userEvent.setup();
    setupMockAdapter();
    const firstCheckpoint = requireCheckpoint(0);
    vi.mocked(getVodDetailFn).mockResolvedValueOnce(TEST_VOD_DETAIL);
    await mountVodPlayerPage();

    // Act
    await user.click(screen.getByRole("button", { name: "00:45" }));
    await user.click(
      screen.getByRole("button", {
        name: requireOption(firstCheckpoint, firstCheckpoint.correctOptionIndex),
      }),
    );
    const promptPanel = screen.getByRole("complementary", { name: "Checkpoint prompt" });
    const promptScope = within(promptPanel);

    // Assert
    expect({
      feedback: promptScope.getByText("Correct").textContent,
      announcement: screen.getByRole("status").textContent,
    }).toStrictEqual({
      feedback: "Correct",
      announcement: "Correct answer. Review the correct answer and explanation.",
    });
    expect(promptPanel.textContent).toContain(
      `Correct answer: ${firstCheckpoint.options[firstCheckpoint.correctOptionIndex]}`,
    );
    expect(promptPanel.textContent).toContain(
      `Your answer: ${firstCheckpoint.options[firstCheckpoint.correctOptionIndex]}`,
    );
    expect(promptScope.getByText(firstCheckpoint.explanation)).toBeDefined();
    expect(promptScope.getByRole("button", { name: "Resume VOD" })).toBeDefined();
  });

  it("reveals Incorrect feedback, explanation, and ✕ pill on wrong selection", async () => {
    expect.assertions(4);

    // Arrange
    const user = userEvent.setup();
    setupMockAdapter();
    const firstCheckpoint = requireCheckpoint(0);
    vi.mocked(getVodDetailFn).mockResolvedValueOnce(TEST_VOD_DETAIL);
    await mountVodPlayerPage();

    // Act
    await user.click(screen.getByRole("button", { name: "00:45" }));
    await user.click(screen.getByRole("button", { name: requireOption(firstCheckpoint, 0) }));
    const promptPanel = screen.getByRole("complementary", { name: "Checkpoint prompt" });
    const promptScope = within(promptPanel);

    // Assert
    expect(promptScope.getByText("Incorrect")).toBeDefined();
    expect(promptScope.getByText(firstCheckpoint.explanation)).toBeDefined();
    expect(promptScope.getByRole("button", { name: "Resume VOD" })).toBeDefined();
    expect(screen.getByRole("button", { name: "00:45 ✕" })).toBeDefined();
  });

  it("clears active prompt back to idle on Resume VOD even when AUTOPLAY_BLOCKED occurs", async () => {
    expect.assertions(5);

    // Arrange
    const user = userEvent.setup();
    const { adapter, getOptions } = setupMockAdapter();
    const firstCheckpoint = requireCheckpoint(0);
    vi.mocked(getVodDetailFn).mockResolvedValueOnce(TEST_VOD_DETAIL);
    await mountVodPlayerPage();
    adapter.play.mockImplementationOnce(() => {
      getOptions().onError?.("AUTOPLAY_BLOCKED");
    });

    // Act
    await user.click(screen.getByRole("button", { name: "00:45" }));
    await user.click(
      screen.getByRole("button", {
        name: requireOption(firstCheckpoint, firstCheckpoint.correctOptionIndex),
      }),
    );
    await user.click(screen.getByRole("button", { name: "Resume VOD" }));
    const promptPanel = screen.getByRole("complementary", { name: "Checkpoint prompt" });

    // Assert
    expect(adapter.play).toHaveBeenCalledOnce();
    expect(
      within(promptPanel).getByText(
        "Play the video. Playback pauses automatically at each Checkpoint.",
      ),
    ).toBeDefined();
    expect(screen.getByRole("region", { name: "VOD player" })).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("button", { name: "00:45 ✓" }).getAttribute("aria-pressed")).toBe(
      "false",
    );
  });

  it("skips answered checkpoints on passive playback and reopens them in review mode on pill click", async () => {
    expect.assertions(5);

    // Arrange
    const user = userEvent.setup();
    const raf = createRafController();
    const { adapter, getOptions } = setupMockAdapter();
    const firstCheckpoint = requireCheckpoint(0);
    vi.mocked(getVodDetailFn).mockResolvedValueOnce(TEST_VOD_DETAIL);
    await mountVodPlayerPage();
    let currentTimeSec = 10;
    adapter.getCurrentTime.mockImplementation(() => currentTimeSec);

    // Act: trigger and answer checkpoint 1, resume, then scrub back and play past checkpoint 1
    act(() => {
      getOptions().onStateChange?.("PLAYING");
      raf.flushFrame();
    });
    currentTimeSec = firstCheckpoint.timeSec;
    act(() => {
      raf.flushFrame();
    });
    await user.click(screen.getByRole("button", { name: requireOption(firstCheckpoint, 0) }));
    await user.click(screen.getByRole("button", { name: "Resume VOD" }));
    currentTimeSec = 10;
    act(() => {
      getOptions().onStateChange?.("PLAYING");
      raf.flushFrame();
    });
    currentTimeSec = firstCheckpoint.timeSec + 10;
    act(() => {
      raf.flushFrame();
    });
    const promptDuringPassiveSkip = within(
      screen.getByRole("complementary", { name: "Checkpoint prompt" }),
    ).getByText("Play the video. Playback pauses automatically at each Checkpoint.");

    // Act: click answered pill to enter review mode
    await user.click(screen.getByRole("button", { name: "00:45 ✕" }));
    const promptScope = within(screen.getByRole("complementary", { name: "Checkpoint prompt" }));

    // Assert
    expect(promptDuringPassiveSkip).toBeDefined();
    expect(adapter.seekTo).toHaveBeenCalledWith(firstCheckpoint.timeSec);
    expect(promptScope.getByText("Incorrect")).toBeDefined();
    expect(promptScope.getByText(firstCheckpoint.explanation)).toBeDefined();
    expect(
      promptScope
        .getByRole("button", { name: requireOption(firstCheckpoint, 0) })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("shows completion summary after all checkpoints are answered and resets session state on Reset Session", async () => {
    expect.assertions(5);

    // Arrange
    const user = userEvent.setup();
    setupMockAdapter();
    const cp1 = requireCheckpoint(0);
    const cp2 = requireCheckpoint(1);
    const cp3 = requireCheckpoint(2);
    const cp4 = requireCheckpoint(3);
    vi.mocked(getVodDetailFn).mockResolvedValueOnce(TEST_VOD_DETAIL);
    await mountVodPlayerPage();

    // Act: answer 3 correct, 1 incorrect
    await user.click(screen.getByRole("button", { name: "00:45" }));
    await user.click(
      screen.getByRole("button", { name: requireOption(cp1, cp1.correctOptionIndex) }),
    );
    await user.click(screen.getByRole("button", { name: "01:50" }));
    await user.click(screen.getByRole("button", { name: requireOption(cp2, 1) }));
    await user.click(screen.getByRole("button", { name: "03:05" }));
    await user.click(
      screen.getByRole("button", { name: requireOption(cp3, cp3.correctOptionIndex) }),
    );
    await user.click(screen.getByRole("button", { name: "04:20" }));
    await user.click(
      screen.getByRole("button", { name: requireOption(cp4, cp4.correctOptionIndex) }),
    );
    const summaryBeforeResume = screen.queryByText("3 / 4 correct");
    await user.click(screen.getByRole("button", { name: "Resume VOD" }));
    const promptPanel = screen.getByRole("complementary", { name: "Checkpoint prompt" });
    const scoreText = within(promptPanel).getByText("3 / 4 correct");
    const backLinkHref = within(promptPanel)
      .getByRole("link", { name: "Back to Catalogue" })
      .getAttribute("href");

    await user.click(within(promptPanel).getByRole("button", { name: "Reset Session" }));
    const pillLabelsAfterReset = within(screen.getByRole("group", { name: "Checkpoints" }))
      .getAllByRole("button")
      .map((button) => button.textContent);

    // Assert
    expect(summaryBeforeResume).toBeNull();
    expect(scoreText).toBeDefined();
    expect(backLinkHref).toBe("/vods");
    expect(
      within(promptPanel).getByText(
        "Play the video. Playback pauses automatically at each Checkpoint.",
      ),
    ).toBeDefined();
    expect(pillLabelsAfterReset).toStrictEqual(["00:45", "01:50", "03:05", "04:20"]);
  });

  it.each([
    {
      description:
        "The video owner disabled playback outside YouTube. Watch directly on YouTube or return to the catalogue.",
      errorCode: "EMBED_DISABLED" as const,
      title: "Embedding disabled for this video",
    },
    {
      description:
        "This YouTube video is private, removed, or unavailable. Check YouTube directly or return to the catalogue.",
      errorCode: "NOT_FOUND" as const,
      title: "Video not found",
    },
    {
      description:
        "Playback failed to initialize in the embedded player. Watch directly on YouTube or return to the catalogue.",
      errorCode: "PLAYBACK_ERROR" as const,
      title: "Unable to load YouTube player",
    },
  ])(
    "replaces the 16:9 player slot with an inline error card when $errorCode fires",
    async ({ description, errorCode, title }) => {
      expect.assertions(5);

      // Arrange
      const { getOptions } = setupMockAdapter();
      vi.mocked(getVodDetailFn).mockResolvedValueOnce(TEST_VOD_DETAIL);
      await mountVodPlayerPage();

      // Act
      act(() => {
        getOptions().onError?.(errorCode);
      });
      const fallbackCard = screen.getByRole("alert");
      const cardScope = within(fallbackCard);
      const youtubeLink = cardScope.getByRole("link", { name: "Watch on YouTube" });
      const catalogueLink = cardScope.getByRole("link", { name: "Back to Catalogue" });

      // Assert
      expect(screen.queryByRole("region", { name: "VOD player" })).toBeNull();
      expect(cardScope.getByRole("heading", { level: 2, name: title })).toBeDefined();
      expect(cardScope.getByText(description)).toBeDefined();
      expect([
        youtubeLink.getAttribute("href"),
        youtubeLink.getAttribute("target"),
        youtubeLink.getAttribute("rel"),
      ]).toStrictEqual([
        `https://www.youtube.com/watch?v=${TEST_VOD_DETAIL.youtubeVideoId}`,
        "_blank",
        "noopener noreferrer",
      ]);
      expect(catalogueLink.getAttribute("href")).toBe("/vods");
    },
  );
});
