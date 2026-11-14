import type { Locator, Page } from "@playwright/test";

import { waitForHydration } from "./hydration";

const HTTP_OK = 200;
const YT_STATE_PLAYING = 1;
const YT_STATE_PAUSED = 2;

interface StubYouTubePlayerSnapshot {
  currentTime: number;
  host: string;
  isReady: boolean;
  pausedCount: number;
  seekCalls: number[];
  state: "UNSTARTED" | "PLAYING" | "PAUSED";
  videoId: string;
}

declare global {
  interface Window {
    __watchpointYtStub?: {
      advanceToAndPlay: (timeSec: number) => void;
      getSnapshot: () => StubYouTubePlayerSnapshot;
      play: () => void;
      setCurrentTime: (timeSec: number) => void;
    };
  }
}

const YOUTUBE_IFRAME_API_STUB_SCRIPT = `
(() => {
  const STATE_PLAYING = ${YT_STATE_PLAYING};
  const STATE_PAUSED = ${YT_STATE_PAUSED};

  let activeSnapshot = null;
  let activeEvents = null;

  class StubYouTubePlayer {
    constructor(element, options) {
      activeEvents = options.events || {};
      activeSnapshot = {
        currentTime: 0,
        host: options.host || "",
        isReady: false,
        pausedCount: 0,
        seekCalls: [],
        state: "UNSTARTED",
        videoId: options.videoId || "",
      };
      element.dataset.stubVideoId = activeSnapshot.videoId;
      queueMicrotask(() => {
        if (!activeSnapshot) return;
        activeSnapshot.isReady = true;
        if (activeEvents && typeof activeEvents.onReady === "function") {
          activeEvents.onReady();
        }
      });
    }

    getCurrentTime() {
      return activeSnapshot ? activeSnapshot.currentTime : 0;
    }

    playVideo() {
      if (!activeSnapshot) return;
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
      activeSnapshot = null;
      activeEvents = null;
    }
  }

  window.YT = { Player: StubYouTubePlayer };
  window.__watchpointYtStub = {
    advanceToAndPlay(timeSec) {
      if (!activeSnapshot) return;
      activeSnapshot.currentTime = timeSec;
      activeSnapshot.state = "PLAYING";
      if (activeEvents && typeof activeEvents.onStateChange === "function") {
        activeEvents.onStateChange({ data: STATE_PLAYING });
      }
    },
    getSnapshot() {
      return activeSnapshot;
    },
    play() {
      if (!activeSnapshot) return;
      activeSnapshot.state = "PLAYING";
      if (activeEvents && typeof activeEvents.onStateChange === "function") {
        activeEvents.onStateChange({ data: STATE_PLAYING });
      }
    },
    setCurrentTime(timeSec) {
      if (!activeSnapshot) return;
      activeSnapshot.currentTime = timeSec;
    },
  };

  if (typeof window.onYouTubeIframeAPIReady === "function") {
    window.onYouTubeIframeAPIReady();
  }
})();
`;

class VodPlayerPage {
  public readonly checkpointsGroup: Locator;
  public readonly checkpointPills: Locator;
  public readonly playerRegion: Locator;
  public readonly promptPanel: Locator;

  private readonly page: Page;

  public constructor(page: Page) {
    this.page = page;
    const main = page.getByRole("main");
    this.playerRegion = main.getByRole("region", { name: "VOD player" });
    this.checkpointsGroup = main.getByRole("group", { name: "Checkpoints" });
    this.checkpointPills = this.checkpointsGroup.getByRole("button");
    this.promptPanel = main.getByRole("complementary", { name: "Checkpoint prompt" });
  }

  public get idlePromptMessage(): Locator {
    return this.promptPanel.getByText(
      "Play the video. Playback pauses automatically at each Checkpoint.",
    );
  }

  public heading(title: string): Locator {
    return this.page.getByRole("main").getByRole("heading", { level: 1, name: title });
  }

  public getCheckpointPill(timestamp: string): Locator {
    return this.checkpointsGroup.getByRole("button", { name: timestamp });
  }

  public promptSkillBadge(skillCategory: string): Locator {
    return this.promptPanel.getByText(skillCategory, { exact: true });
  }

  public promptQuestion(question: string): Locator {
    return this.promptPanel.getByText(question);
  }

  public getPromptOption(optionText: string): Locator {
    return this.promptPanel
      .getByRole("group", { name: "Prompt options" })
      .getByRole("button", { name: optionText });
  }

  public async stubYouTubeApi() {
    await this.page.route("https://www.youtube.com/iframe_api", async (route) => {
      await route.fulfill({
        body: YOUTUBE_IFRAME_API_STUB_SCRIPT,
        contentType: "application/javascript",
        status: HTTP_OK,
      });
    });
  }

  public async goto(vodId: string) {
    await this.page.goto(`/vods/${vodId}`);
    await waitForHydration(this.page);
  }

  public async waitForPlayerReady() {
    await this.page.waitForFunction(
      () => window.__watchpointYtStub?.getSnapshot()?.isReady === true,
    );
  }

  public async clickCheckpointPill(timestamp: string) {
    await this.getCheckpointPill(timestamp).click();
  }

  public async selectPromptOption(optionText: string) {
    await this.getPromptOption(optionText).click();
  }

  public async simulatePlaybackAcross(targetTimeSec: number) {
    await this.page.evaluate(async (timeSec) => {
      window.__watchpointYtStub?.play();
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => {
          resolve();
        });
      });
      window.__watchpointYtStub?.setCurrentTime(timeSec);
    }, targetTimeSec);
  }

  public async getStubPlayerState(): Promise<StubYouTubePlayerSnapshot | null> {
    return await this.page.evaluate(() => window.__watchpointYtStub?.getSnapshot() ?? null);
  }
}

export { VodPlayerPage };
export type { StubYouTubePlayerSnapshot };
