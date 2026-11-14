import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import { AuthClient, HomePage, VodPlayerPage, VodsPage } from "./page-objects";

const SHU_VOD_ID = "shu-ana-owcs-kr-s3";
const SHU_TITLE = "[ Shu ] Ana Main Madness | Zeta Division vs Team Falcons | OWCS Korea Stage 3";
const SHU_CHECKPOINT_COUNT = 4;
const FIRST_CHECKPOINT_TIME_SEC = 45;
const FIRST_CHECKPOINT_QUESTION =
  "Before the first fight breaks out, what is your primary win condition with Nano Boost?";
const FIRST_CHECKPOINT_OPTION_ONE = "Save Nano Boost strictly as an emergency heal";
const FIRST_CHECKPOINT_OPTION_TWO = "Use Nano Boost to enable your main tank dive initiation";
const SECOND_CHECKPOINT_TIME_SEC = 110;
const SECOND_CHECKPOINT_QUESTION =
  "The enemy Winston dives your backline; how should you sequence Sleep Dart and Biotic Grenade?";

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

test("navigates from /vods VOD card to /vods/$vodId Studio Split player", async ({
  page,
  baseURL,
}) => {
  // Arrange
  const vodsPage = new VodsPage(page);
  const vodPlayerPage = new VodPlayerPage(page);
  await vodPlayerPage.stubYouTubeApi();
  await signUpTestUser(page, baseURL);
  await vodsPage.goto();

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
  const vodPlayerPage = new VodPlayerPage(page);
  await vodPlayerPage.stubYouTubeApi();
  await signUpTestUser(page, baseURL);
  await vodPlayerPage.goto(SHU_VOD_ID);
  await vodPlayerPage.waitForPlayerReady();

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

test("clicking a checkpoint pill seeks, pauses playback, and opens that checkpoint prompt", async ({
  page,
  baseURL,
}) => {
  // Arrange
  const vodPlayerPage = new VodPlayerPage(page);
  await vodPlayerPage.stubYouTubeApi();
  await signUpTestUser(page, baseURL);
  await vodPlayerPage.goto(SHU_VOD_ID);
  await vodPlayerPage.waitForPlayerReady();

  // Act
  await vodPlayerPage.clickCheckpointPill("01:50");
  await vodPlayerPage.selectPromptOption(FIRST_CHECKPOINT_OPTION_ONE);
  await vodPlayerPage.clickCheckpointPill("00:45");
  await vodPlayerPage.selectPromptOption(FIRST_CHECKPOINT_OPTION_ONE);
  await vodPlayerPage.selectPromptOption(FIRST_CHECKPOINT_OPTION_TWO);

  // Assert
  await expect(vodPlayerPage.getCheckpointPill("00:45")).toHaveAttribute("aria-pressed", "true");
  await expect(vodPlayerPage.promptSkillBadge("Strategy")).toBeVisible();
  await expect(vodPlayerPage.getPromptOption(FIRST_CHECKPOINT_OPTION_ONE)).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(vodPlayerPage.getPromptOption(FIRST_CHECKPOINT_OPTION_TWO)).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect
    .poll(async () => await vodPlayerPage.getStubPlayerState())
    .toMatchObject({
      currentTime: FIRST_CHECKPOINT_TIME_SEC,
      seekCalls: [SECOND_CHECKPOINT_TIME_SEC, FIRST_CHECKPOINT_TIME_SEC],
      state: "PAUSED",
    });
});

test("clicking second checkpoint pill seeks to 110s, pauses, and renders Tactics prompt", async ({
  page,
  baseURL,
}) => {
  // Arrange
  const vodPlayerPage = new VodPlayerPage(page);
  await vodPlayerPage.stubYouTubeApi();
  await signUpTestUser(page, baseURL);
  await vodPlayerPage.goto(SHU_VOD_ID);
  await vodPlayerPage.waitForPlayerReady();

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
