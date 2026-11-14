import type { Locator, Page } from "@playwright/test";

import { waitForHydration } from "./hydration";
import {
  type StubYouTubePlayerSnapshot,
  YOUTUBE_IFRAME_API_STUB_SCRIPT,
} from "./youtube-player-stub";

const HTTP_OK = 200;

type CheckpointPillStatus = "correct" | "incorrect";

class VodPlayerPage {
  public readonly checkpointsGroup: Locator;
  public readonly checkpointPills: Locator;
  public readonly playerErrorCard: Locator;
  public readonly playerRegion: Locator;
  public readonly promptOptionsGroup: Locator;
  public readonly promptPanel: Locator;

  private readonly page: Page;

  public constructor(page: Page) {
    this.page = page;
    const main = page.getByRole("main");
    this.playerRegion = main.getByRole("region", { name: "VOD player" });
    this.playerErrorCard = main.getByRole("alert");
    this.checkpointsGroup = main.getByRole("group", { name: "Checkpoints" });
    this.checkpointPills = this.checkpointsGroup.getByRole("button");
    this.promptPanel = main.getByRole("complementary", { name: "Checkpoint prompt" });
    this.promptOptionsGroup = this.promptPanel.getByRole("group", { name: "Prompt options" });
  }

  public get completionHeading(): Locator {
    return this.promptPanel.getByText("Session complete", { exact: true });
  }

  public get errorBackToCatalogueLink(): Locator {
    return this.playerErrorCard.getByRole("link", { name: "Back to Catalogue" });
  }

  public get idlePromptMessage(): Locator {
    return this.promptPanel.getByText(
      "Play the video. Playback pauses automatically at each Checkpoint.",
    );
  }

  public get promptBackToCatalogueLink(): Locator {
    return this.promptPanel.getByRole("link", { name: "Back to Catalogue" });
  }

  public get resetSessionButton(): Locator {
    return this.promptPanel.getByRole("button", { name: "Reset Session" });
  }

  public get resumeVodButton(): Locator {
    return this.promptPanel.getByRole("button", { name: "Resume VOD" });
  }

  public get watchOnYouTubeLink(): Locator {
    return this.playerErrorCard.getByRole("link", { name: "Watch on YouTube" });
  }

  public heading(title: string): Locator {
    return this.page.getByRole("main").getByRole("heading", { level: 1, name: title });
  }

  public getCheckpointPill(timestamp: string, status?: CheckpointPillStatus): Locator {
    if (status === undefined) {
      return this.checkpointsGroup.getByRole("button", { exact: true, name: timestamp });
    }
    const symbol = status === "correct" ? "✓" : "✕";
    return this.checkpointsGroup.getByRole("button", {
      exact: true,
      name: `${timestamp} ${symbol}`,
    });
  }

  public promptSkillBadge(skillCategory: string): Locator {
    return this.promptPanel.getByText(skillCategory, { exact: true });
  }

  public promptQuestion(question: string): Locator {
    return this.promptPanel.getByText(question);
  }

  public getPromptOption(optionText: string): Locator {
    return this.promptOptionsGroup.getByRole("button", { exact: true, name: optionText });
  }

  public promptFeedback(verdict: "Correct" | "Incorrect"): Locator {
    return this.promptPanel.getByText(verdict, { exact: true });
  }

  public promptExplanation(explanation: string): Locator {
    return this.promptPanel.getByText(explanation);
  }

  public completionScore(correctCount: number, totalCount: number): Locator {
    return this.promptPanel.getByText(`${correctCount} / ${totalCount} correct`, { exact: true });
  }

  public playerErrorHeading(title: string): Locator {
    return this.playerErrorCard.getByRole("heading", { level: 2, name: title });
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
      () => globalThis.watchpointYtStub?.getSnapshot()?.isReady === true,
    );
  }

  public async startPlayback(): Promise<number> {
    return await this.page.evaluate(() => globalThis.watchpointYtStub?.play() ?? 0);
  }

  public async setCurrentTime(timeSec: number): Promise<number> {
    return await this.page.evaluate(
      (seconds) => globalThis.watchpointYtStub?.setCurrentTime(seconds) ?? 0,
      timeSec,
    );
  }

  public async blockNextPlay() {
    await this.page.evaluate(() => {
      globalThis.watchpointYtStub?.blockNextPlay();
    });
  }

  public async emitPlayerError(errorCode: number) {
    await this.page.evaluate((code) => {
      globalThis.watchpointYtStub?.emitError(code);
    }, errorCode);
  }

  public async clickCheckpointPill(timestamp: string, status?: CheckpointPillStatus) {
    await this.getCheckpointPill(timestamp, status).click();
  }

  public async selectPromptOption(optionText: string) {
    await this.getPromptOption(optionText).click();
  }

  public async answerCheckpoint(timestamp: string, optionText: string) {
    await this.clickCheckpointPill(timestamp);
    await this.selectPromptOption(optionText);
  }

  public async resumeVod() {
    await this.resumeVodButton.click();
  }

  public async resetSession() {
    await this.resetSessionButton.click();
  }

  public async simulatePlaybackAcross(targetTimeSec: number) {
    const readCountAtPlay = await this.startPlayback();
    await this.waitForTimeReadAfter(readCountAtPlay);
    const readCountAtSeek = await this.setCurrentTime(targetTimeSec);
    await this.waitForTimeReadAfter(readCountAtSeek);
  }

  public async playbackFromTo(fromTimeSec: number, toTimeSec: number) {
    await this.setCurrentTime(fromTimeSec);
    await this.simulatePlaybackAcross(toTimeSec);
  }

  public async getStubPlayerState(): Promise<StubYouTubePlayerSnapshot | null> {
    return await this.page.evaluate(() => globalThis.watchpointYtStub?.getSnapshot() ?? null);
  }

  public async getStubPlayerPausedCount(): Promise<number> {
    const snapshot = await this.getStubPlayerState();
    if (snapshot === null) {
      throw new Error("YouTube player is not initialized");
    }
    return snapshot.pausedCount;
  }

  private async waitForTimeReadAfter(previousReadCount: number) {
    await this.page.waitForFunction(
      (count) => (globalThis.watchpointYtStub?.getSnapshot()?.currentTimeReadCount ?? 0) > count,
      previousReadCount,
    );
  }
}

export { VodPlayerPage };
