import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import { AuthClient, VodPlayerPage, VodsPage } from "./page-objects";

const SHU_VOD_ID = "shu-ana-owcs-kr-s3";
const SHU_YOUTUBE_WATCH_URL = "https://www.youtube.com/watch?v=Ha5QwBV3Rhk";
const SHU_CHECKPOINT_COUNT = 4;
const SHU_CORRECT_COUNT_THREE = 3;
const FIRST_CHECKPOINT_TIME_SEC = 45;
const FIRST_CHECKPOINT_QUESTION =
  "Before the first fight breaks out, what is your primary win condition with Nano Boost?";
const FIRST_CHECKPOINT_OPTION_TWO =
  "Use Nano Boost to enable your main tank's dive initiation and build momentum";
const SECOND_CHECKPOINT_TIME_SEC = 110;
const SECOND_CHECKPOINT_OPTION_TWO =
  "Throw Biotic Grenade into his barrier shield and save Sleep Dart for later";
const THIRD_CHECKPOINT_TIME_SEC = 185;
const THIRD_CHECKPOINT_OPTION_THREE =
  "Take a safe off-corner with natural cover and clear LoS to both your tank and peel";
const FOURTH_CHECKPOINT_TIME_SEC = 260;
const FOURTH_CHECKPOINT_OPTION_FOUR =
  "The enemy support defensive ultimate is online and ready to counter your engage";
const PASSIVE_SCRUB_START_SEC = 10;
const YT_ERROR_NOT_FOUND = 100;
const YT_ERROR_EMBED_DISABLED = 101;
const YT_ERROR_EMBED_DISABLED_ALT = 150;

test("shows completion summary and resets session in-memory on Reset Session", async ({
  page,
  baseURL,
}) => {
  // Arrange
  const vodPlayerPage = await openAuthenticatedVodPlayer(page, baseURL, SHU_VOD_ID);
  // Act & Assert completion
  await completeShuSession(vodPlayerPage);
  await expect(vodPlayerPage.completionHeading).toBeVisible();
  await expect(
    vodPlayerPage.completionScore(SHU_CORRECT_COUNT_THREE, SHU_CHECKPOINT_COUNT),
  ).toBeVisible();
  // Act & Assert reset + re-trigger
  await vodPlayerPage.resetSession();
  await expect(vodPlayerPage.checkpointPills).toHaveText(["00:45", "01:50", "03:05", "04:20"]);
  await vodPlayerPage.playbackFromTo(PASSIVE_SCRUB_START_SEC, FIRST_CHECKPOINT_TIME_SEC);
  await expect(vodPlayerPage.promptQuestion(FIRST_CHECKPOINT_QUESTION)).toBeVisible();
  await expect
    .poll(async () => await vodPlayerPage.getStubPlayerState())
    .toMatchObject({
      seekCalls: [
        FIRST_CHECKPOINT_TIME_SEC,
        SECOND_CHECKPOINT_TIME_SEC,
        THIRD_CHECKPOINT_TIME_SEC,
        FOURTH_CHECKPOINT_TIME_SEC,
      ],
      state: "PAUSED",
    });
});

test("navigates to /vods from completion summary Back to Catalogue link", async ({
  page,
  baseURL,
}) => {
  // Arrange
  const vodPlayerPage = await openAuthenticatedVodPlayer(page, baseURL, SHU_VOD_ID);
  const vodsPage = new VodsPage(page);
  await completeShuSession(vodPlayerPage);
  // Act
  await vodPlayerPage.promptBackToCatalogueLink.click();
  // Assert
  await expect(page).toHaveURL(/\/vods$/u);
  await expect(vodsPage.heading).toBeVisible();
});

test("replaces player slot with EMBED_DISABLED alert card on error 101", async ({
  page,
  baseURL,
}) => {
  // Arrange
  const vodPlayerPage = await openAuthenticatedVodPlayer(page, baseURL, SHU_VOD_ID);
  // Act
  await vodPlayerPage.emitPlayerError(YT_ERROR_EMBED_DISABLED);
  // Assert
  await expect(vodPlayerPage.playerRegion).toBeHidden();
  await expect(vodPlayerPage.playerErrorHeading("Embedding disabled for this video")).toBeVisible();
  await expect(vodPlayerPage.watchOnYouTubeLink).toHaveAttribute("href", SHU_YOUTUBE_WATCH_URL);
  await expect(vodPlayerPage.errorBackToCatalogueLink).toHaveAttribute("href", "/vods");
});

test("replaces player slot with EMBED_DISABLED alert card on error 150 and links back to /vods", async ({
  page,
  baseURL,
}) => {
  // Arrange
  const vodPlayerPage = await openAuthenticatedVodPlayer(page, baseURL, SHU_VOD_ID);
  const vodsPage = new VodsPage(page);
  // Act & Assert alert card
  await vodPlayerPage.emitPlayerError(YT_ERROR_EMBED_DISABLED_ALT);
  await expect(vodPlayerPage.playerErrorHeading("Embedding disabled for this video")).toBeVisible();
  // Act & Assert navigation
  await vodPlayerPage.errorBackToCatalogueLink.click();
  await expect(page).toHaveURL(/\/vods$/u);
  await expect(vodsPage.heading).toBeVisible();
});

test("replaces player slot with NOT_FOUND alert card on error 100", async ({ page, baseURL }) => {
  // Arrange
  const vodPlayerPage = await openAuthenticatedVodPlayer(page, baseURL, SHU_VOD_ID);
  // Act
  await vodPlayerPage.emitPlayerError(YT_ERROR_NOT_FOUND);
  // Assert
  await expect(vodPlayerPage.playerRegion).toBeHidden();
  await expect(vodPlayerPage.playerErrorHeading("Video not found")).toBeVisible();
  await expect(vodPlayerPage.watchOnYouTubeLink).toHaveAttribute("href", SHU_YOUTUBE_WATCH_URL);
  await expect(vodPlayerPage.errorBackToCatalogueLink).toHaveAttribute("href", "/vods");
});

async function completeShuSession(vodPlayerPage: VodPlayerPage) {
  await vodPlayerPage.answerCheckpoint("00:45", FIRST_CHECKPOINT_OPTION_TWO);
  await vodPlayerPage.answerCheckpoint("01:50", SECOND_CHECKPOINT_OPTION_TWO);
  await vodPlayerPage.answerCheckpoint("03:05", THIRD_CHECKPOINT_OPTION_THREE);
  await vodPlayerPage.answerCheckpoint("04:20", FOURTH_CHECKPOINT_OPTION_FOUR);
  await vodPlayerPage.resumeVod();
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
    email: `vod-player-session-${globalThis.crypto.randomUUID()}@example.com`,
    name: "Watchpoint Player Tester",
    password: "watchpoint-test-password",
  });
  if (!response.ok()) {
    throw new Error(`Test user registration failed (${response.status()})`);
  }
}
