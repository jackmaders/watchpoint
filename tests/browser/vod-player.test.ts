import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import { AuthClient, HomePage, NotFoundPage, VodPlayerPage, VodsPage } from "./page-objects";

const SHU_VOD_ID = "shu-ana-owcs-kr-s3";
const SHU_TITLE = "[ Shu ] Ana Main Madness | Zeta Division vs Team Falcons | OWCS Korea Stage 3";
const SHU_CHECKPOINT_COUNT = 4;
const FIRST_CHECKPOINT_TIME_SEC = 45;
const FIRST_CHECKPOINT_QUESTION =
  "Before the first fight breaks out, what is your primary win condition with Nano Boost?";
const FIRST_CHECKPOINT_OPTION_ONE = "Save Nano Boost strictly as an emergency heal for your Tracer";
const FIRST_CHECKPOINT_OPTION_TWO =
  "Use Nano Boost to enable your main tank's dive initiation and build momentum";
const FIRST_CHECKPOINT_EXPLANATION =
  "Pairing Nano Boost with your Winston's primal engage or dive commitment creates immediate backline pressure and secures space around the first choke.";
const SECOND_CHECKPOINT_TIME_SEC = 110;
const SECOND_CHECKPOINT_QUESTION =
  "The enemy Winston dives your backline; how should you sequence Sleep Dart and Biotic Grenade?";
const SECOND_CHECKPOINT_OPTION_ONE =
  "Bait or wait out his bubble timing, land Sleep Dart, then anti-nade as your team collapses";
const PASSIVE_SCRUB_START_SEC = 10;
const PASSIVE_SCRUB_END_SEC = 60;

test("redirects unauthenticated visitors from /vods/$vodId to /", async ({ page }) => {
  // Arrange
  const vodPlayerPage = new VodPlayerPage(page);
  const homePage = new HomePage(page);

  // Act
  await vodPlayerPage.goto(SHU_VOD_ID);

  // Assert
  await expect(page).toHaveURL(/\/$/u);
  await expect(homePage.heading).toBeVisible();
});

test("renders NotFoundPage when authenticated user navigates to nonexistent vodId", async ({
  page,
  baseURL,
  browserDiagnostics,
}) => {
  // Arrange
  const vodPlayerPage = new VodPlayerPage(page);
  const notFoundPage = new NotFoundPage(page);
  browserDiagnostics.allowNotFoundPath("/vods/nonexistent-vod");
  await signUpTestUser(page, baseURL);

  // Act
  await vodPlayerPage.goto("nonexistent-vod");

  // Assert
  await expect(page).toHaveURL(/\/vods\/nonexistent-vod$/u);
  await expect(notFoundPage.heading).toBeVisible();
  await expect(notFoundPage.message).toBeVisible();
  await expect(notFoundPage.returnHomeLink).toHaveAttribute("href", "/");
});

test("navigates from /vods VOD card to /vods/$vodId Studio Split player", async ({
  page,
  baseURL,
}) => {
  // Arrange
  const { vodPlayerPage, vodsPage } = await openAuthenticatedVodsPage(page, baseURL);

  // Act
  await vodsPage.getCardLink(SHU_TITLE).click();
  await vodPlayerPage.waitForPlayerReady();

  // Assert
  await expect(page).toHaveURL(/\/vods\/shu-ana-owcs-kr-s3$/u);
  await expect(vodPlayerPage.heading(SHU_TITLE)).toBeVisible();
  await expect(vodPlayerPage.playerRegion).toBeVisible();
  await expect(vodPlayerPage.idlePromptMessage).toBeVisible();
  await expect(vodPlayerPage.checkpointPills).toHaveCount(SHU_CHECKPOINT_COUNT);
});

test("auto-pauses playback on requestAnimationFrame checkpoint crossing and opens prompt", async ({
  page,
  baseURL,
}) => {
  // Arrange
  const vodPlayerPage = await openAuthenticatedVodPlayer(page, baseURL, SHU_VOD_ID);

  // Act
  await vodPlayerPage.simulatePlaybackAcross(FIRST_CHECKPOINT_TIME_SEC);

  // Assert
  await expect(vodPlayerPage.promptSkillBadge("Strategy")).toBeVisible();
  await expect(vodPlayerPage.promptQuestion(FIRST_CHECKPOINT_QUESTION)).toBeVisible();
  await expect(vodPlayerPage.getCheckpointPill("00:45")).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(async () => await vodPlayerPage.getStubPlayerState())
    .toMatchObject({
      host: "https://www.youtube-nocookie.com",
      pausedCount: 1,
      state: "PAUSED",
      videoId: "Ha5QwBV3Rhk",
    });
});

test("clicking a checkpoint pill seeks, pauses playback, and displays that checkpoint prompt", async ({
  page,
  baseURL,
}) => {
  // Arrange
  const vodPlayerPage = await openAuthenticatedVodPlayer(page, baseURL, SHU_VOD_ID);
  await vodPlayerPage.startPlayback();

  // Act
  await vodPlayerPage.clickCheckpointPill("01:50");

  // Assert
  await expect(vodPlayerPage.getCheckpointPill("01:50")).toHaveAttribute("aria-pressed", "true");
  await expect(vodPlayerPage.promptSkillBadge("Tactics")).toBeVisible();
  await expect(vodPlayerPage.promptQuestion(SECOND_CHECKPOINT_QUESTION)).toBeVisible();
  await expect
    .poll(async () => await vodPlayerPage.getStubPlayerState())
    .toMatchObject({
      currentTime: SECOND_CHECKPOINT_TIME_SEC,
      pausedCount: 1,
      seekCalls: [SECOND_CHECKPOINT_TIME_SEC],
      state: "PAUSED",
    });
});

test("immediately grades selected option, locks options, and reveals explanation", async ({
  page,
  baseURL,
}) => {
  // Arrange
  const vodPlayerPage = await openAuthenticatedVodPlayer(page, baseURL, SHU_VOD_ID);
  await vodPlayerPage.clickCheckpointPill("00:45");

  // Act
  await vodPlayerPage.selectPromptOption(FIRST_CHECKPOINT_OPTION_ONE);

  // Assert
  await expect(vodPlayerPage.getPromptOption(FIRST_CHECKPOINT_OPTION_TWO)).toBeDisabled();
  await expect(vodPlayerPage.promptFeedback("Incorrect")).toBeVisible();
  await expect(vodPlayerPage.promptExplanation(FIRST_CHECKPOINT_EXPLANATION)).toBeVisible();
  await expect(vodPlayerPage.getCheckpointPill("00:45", "incorrect")).toBeVisible();
  await expect(vodPlayerPage.resumeVodButton).toBeVisible();
});

test("resets selected option and seeks when switching to another checkpoint pill", async ({
  page,
  baseURL,
}) => {
  // Arrange
  const vodPlayerPage = await openAuthenticatedVodPlayer(page, baseURL, SHU_VOD_ID);
  await vodPlayerPage.answerCheckpoint("01:50", SECOND_CHECKPOINT_OPTION_ONE);

  // Act
  await vodPlayerPage.clickCheckpointPill("00:45");

  // Assert
  await expect(vodPlayerPage.getCheckpointPill("00:45")).toHaveAttribute("aria-pressed", "true");
  await expect(vodPlayerPage.promptSkillBadge("Strategy")).toBeVisible();
  await expect(vodPlayerPage.getPromptOption(FIRST_CHECKPOINT_OPTION_ONE)).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect
    .poll(async () => await vodPlayerPage.getStubPlayerState())
    .toMatchObject({
      currentTime: FIRST_CHECKPOINT_TIME_SEC,
      seekCalls: [SECOND_CHECKPOINT_TIME_SEC, FIRST_CHECKPOINT_TIME_SEC],
      state: "PAUSED",
    });
});

test("shows Correct feedback with ✓ pill and returns to idle playing state on Resume VOD", async ({
  page,
  baseURL,
}) => {
  // Arrange
  const vodPlayerPage = await openAuthenticatedVodPlayer(page, baseURL, SHU_VOD_ID);

  // Act & Assert grading
  await vodPlayerPage.answerCheckpoint("00:45", FIRST_CHECKPOINT_OPTION_TWO);
  await expect(vodPlayerPage.promptFeedback("Correct")).toBeVisible();
  await expect(vodPlayerPage.getCheckpointPill("00:45", "correct")).toBeVisible();

  // Act & Assert resume
  await vodPlayerPage.resumeVod();
  await expect(vodPlayerPage.idlePromptMessage).toBeVisible();
  await expect(vodPlayerPage.getCheckpointPill("00:45", "correct")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect
    .poll(async () => await vodPlayerPage.getStubPlayerState())
    .toMatchObject({ playCount: 1, state: "PLAYING" });
});

test("clears prompt back to idle on Resume VOD even when AUTOPLAY_BLOCKED occurs", async ({
  page,
  baseURL,
}) => {
  // Arrange
  const vodPlayerPage = await openAuthenticatedVodPlayer(page, baseURL, SHU_VOD_ID);
  await vodPlayerPage.answerCheckpoint("00:45", FIRST_CHECKPOINT_OPTION_TWO);
  await vodPlayerPage.blockNextPlay();

  // Act
  await vodPlayerPage.resumeVod();

  // Assert
  await expect(vodPlayerPage.idlePromptMessage).toBeVisible();
  await expect(vodPlayerPage.playerRegion).toBeVisible();
  await expect(vodPlayerPage.playerErrorCard).toBeHidden();
  await expect
    .poll(async () => await vodPlayerPage.getStubPlayerState())
    .toMatchObject({ playCount: 1, state: "PAUSED" });
});

test("skips answered checkpoints on passive playback and opens review mode on pill click", async ({
  page,
  baseURL,
}) => {
  // Arrange
  const vodPlayerPage = await openAuthenticatedVodPlayer(page, baseURL, SHU_VOD_ID);
  await triggerAndAnswerFirstCheckpoint(vodPlayerPage, FIRST_CHECKPOINT_OPTION_ONE);

  // Act & Assert passive skip
  await vodPlayerPage.playbackFromTo(PASSIVE_SCRUB_START_SEC, PASSIVE_SCRUB_END_SEC);
  await expect(vodPlayerPage.idlePromptMessage).toBeVisible();
  await expect
    .poll(async () => await vodPlayerPage.getStubPlayerState())
    .toMatchObject({ state: "PLAYING" });

  // Act & Assert review mode
  await vodPlayerPage.clickCheckpointPill("00:45", "incorrect");
  await expect(vodPlayerPage.promptExplanation(FIRST_CHECKPOINT_EXPLANATION)).toBeVisible();
  await expect(vodPlayerPage.getPromptOption(FIRST_CHECKPOINT_OPTION_ONE)).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect
    .poll(async () => await vodPlayerPage.getStubPlayerState())
    .toMatchObject({ currentTime: FIRST_CHECKPOINT_TIME_SEC, state: "PAUSED" });
});

test("resuming a reviewed checkpoint does not retrigger it", async ({ page, baseURL }) => {
  // Arrange
  const vodPlayerPage = await openAuthenticatedVodPlayer(page, baseURL, SHU_VOD_ID);
  await triggerAndAnswerFirstCheckpoint(vodPlayerPage, FIRST_CHECKPOINT_OPTION_ONE);
  await vodPlayerPage.clickCheckpointPill("00:45", "incorrect");
  const pausedCountAfterReview = await vodPlayerPage.getStubPlayerPausedCount();

  // Act
  await vodPlayerPage.resumeVod();
  await vodPlayerPage.playbackFromTo(FIRST_CHECKPOINT_TIME_SEC, PASSIVE_SCRUB_END_SEC);

  // Assert
  await expect(vodPlayerPage.idlePromptMessage).toBeVisible();
  await expect(vodPlayerPage.promptExplanation(FIRST_CHECKPOINT_EXPLANATION)).toBeHidden();
  await expect
    .poll(async () => await vodPlayerPage.getStubPlayerState())
    .toMatchObject({ pausedCount: pausedCountAfterReview, state: "PLAYING" });
});

async function triggerAndAnswerFirstCheckpoint(vodPlayerPage: VodPlayerPage, optionText: string) {
  await vodPlayerPage.simulatePlaybackAcross(FIRST_CHECKPOINT_TIME_SEC);
  await vodPlayerPage.selectPromptOption(optionText);
  await vodPlayerPage.resumeVod();
}

async function openAuthenticatedVodsPage(page: Page, baseURL: string | undefined) {
  const vodsPage = new VodsPage(page);
  const vodPlayerPage = new VodPlayerPage(page);
  await vodPlayerPage.stubYouTubeApi();
  await signUpTestUser(page, baseURL);
  await vodsPage.goto();
  return { vodPlayerPage, vodsPage };
}

async function openAuthenticatedVodPlayer(page: Page, baseURL: string | undefined, vodId: string) {
  const vodPlayerPage = new VodPlayerPage(page);
  await vodPlayerPage.stubYouTubeApi();
  await signUpTestUser(page, baseURL);
  await vodPlayerPage.goto(vodId);
  await vodPlayerPage.waitForPlayerReady();
  return vodPlayerPage;
}

async function signUpTestUser(page: Page, baseURL: string | undefined) {
  const authClient = new AuthClient(page);
  const response = await authClient.signUp({
    baseURL,
    email: `vod-player-${globalThis.crypto.randomUUID()}@example.com`,
    name: "Watchpoint Player Tester",
    password: "watchpoint-test-password",
  });
  if (!response.ok()) {
    throw new Error(`Test user registration failed (${response.status()})`);
  }
}
