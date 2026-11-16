import { expect, test } from "./fixtures";
import { AuthClient, HomePage, VodPlayerPage, VodsPage } from "./page-objects";

const MOBILE_VIEWPORT = { height: 844, width: 390 };
const SHU_VOD_ID = "shu-ana-owcs-kr-s3";
const SEEDED_VOD_COUNT = 3;
const FIRST_CHECKPOINT_SECONDS = 45;
const CORRECT_ANSWER =
  "Use Nano Boost to enable your main tank's dive initiation and build momentum";

test.use({ viewport: MOBILE_VIEWPORT });

test("opens and dismisses mobile navigation with the keyboard", async ({ page }, testInfo) => {
  const home = new HomePage(page);
  const menu = page.getByRole("button", { name: "Open menu" });
  await home.goto();
  await page.screenshot({
    animations: "disabled",
    fullPage: true,
    path: testInfo.outputPath("home-mobile.png"),
  });
  await menu.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Navigation" })).toBeVisible();
  await page.screenshot({
    animations: "disabled",
    fullPage: true,
    path: testInfo.outputPath("navigation-mobile.png"),
  });
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
});

test("navigates to About from the mobile drawer", async ({ page }, testInfo) => {
  const home = new HomePage(page);
  await home.goto();
  await home.navigateToAbout();
  await expect(page).toHaveURL(/\/about$/u);
  await page.screenshot({
    animations: "disabled",
    fullPage: true,
    path: testInfo.outputPath("about-mobile.png"),
  });
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("recovers from an empty catalogue search using the keyboard", async ({
  page,
  baseURL,
}, testInfo) => {
  const catalogue = new VodsPage(page);

  await test.step("open the authenticated catalogue", async () => {
    const response = await new AuthClient(page).signUp({ baseURL, name: "Mobile Reviewer" });
    expect(response.ok()).toBe(true);
    await catalogue.goto();
    await page.screenshot({
      animations: "disabled",
      fullPage: true,
      path: testInfo.outputPath("catalogue-mobile.png"),
    });
  });

  await catalogue.search("No matching replay");
  await expect(catalogue.emptyStateHeading).toBeVisible();
  await page.screenshot({
    animations: "disabled",
    fullPage: true,
    path: testInfo.outputPath("catalogue-empty-mobile.png"),
  });
  await catalogue.clearFiltersButton.focus();
  await page.keyboard.press("Enter");
  await expect(catalogue.vodCards).toHaveCount(SEEDED_VOD_COUNT);
});

test("answers a checkpoint using the keyboard and resumes playback", async ({
  page,
  baseURL,
}, testInfo) => {
  const player = new VodPlayerPage(page);

  await test.step("open the seeded VOD with the deterministic player adapter", async () => {
    await player.stubYouTubeApi();
    const response = await new AuthClient(page).signUp({ baseURL, name: "Mobile VOD Reviewer" });
    expect(response.ok()).toBe(true);
    await player.goto(SHU_VOD_ID);
    await player.waitForPlayerReady();
    await page.screenshot({
      animations: "disabled",
      fullPage: true,
      path: testInfo.outputPath("player-idle-mobile.png"),
    });
  });

  await test.step("answer the automatically opened prompt", async () => {
    await player.simulatePlaybackAcross(FIRST_CHECKPOINT_SECONDS);
    await expect(player.promptOptionsGroup).toBeVisible();
    await page.screenshot({
      animations: "disabled",
      fullPage: true,
      path: testInfo.outputPath("player-question-mobile.png"),
    });
    await player.getPromptOption(CORRECT_ANSWER).focus();
    await page.keyboard.press("Enter");
    await expect(player.promptFeedback("Correct")).toBeVisible();
    await page.screenshot({
      animations: "disabled",
      fullPage: true,
      path: testInfo.outputPath("player-feedback-mobile.png"),
    });
  });

  await player.resumeVodButton.focus();
  await page.keyboard.press("Enter");
  await expect(player.idlePromptMessage).toBeVisible();
});
