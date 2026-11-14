import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import { AuthClient, HomePage, VodsPage } from "./page-objects";

const SEEDED_VOD_COUNT = 3;

const SHU_TITLE = "[ Shu ] Ana Main Madness | Zeta Division vs Team Falcons | OWCS Korea Stage 3";
const JUNBIN_TITLE =
  "[ Junbin ] Primal Punch | Crazy Raccoon vs Zeta Division | OWCS Korea Stage 3";
const TAEJONG_TITLE =
  "[ Taejong ] One Trick Tracer | Poker Face vs RODE Zanside Gaming | OWCS Korea Stage 3";

test("redirects unauthenticated visitors from /vods to /", async ({ page }) => {
  // Arrange
  const vodsPage = new VodsPage(page);
  const homePage = new HomePage(page);

  // Act
  await vodsPage.goto();

  // Assert
  await expect(page).toHaveURL(/\/$/u);
  await expect(homePage.heading).toBeVisible();
});

test("redirects authenticated visitors from / to /vods and shows VODs link in header", async ({
  page,
  baseURL,
}) => {
  // Arrange
  const homePage = new HomePage(page);
  const vodsPage = new VodsPage(page);
  await signUpTestUser(page, baseURL);

  // Act
  await homePage.goto();

  // Assert
  await expect(page).toHaveURL(/\/vods$/u);
  await expect(vodsPage.heading).toBeVisible();
  await expect(vodsPage.headerVodsLink).toBeVisible();
  await expect(vodsPage.headerVodsLink).toHaveAttribute("href", "/vods");
  await expect(vodsPage.headerTodosLink).toBeHidden();
});

test("renders the 3 seeded VOD cards with links to detail routes", async ({ page, baseURL }) => {
  // Arrange
  const vodsPage = new VodsPage(page);
  await signUpTestUser(page, baseURL);

  // Act
  await vodsPage.goto();

  // Assert
  await expect(vodsPage.vodCards).toHaveCount(SEEDED_VOD_COUNT);
  await expect(vodsPage.getCardLink(SHU_TITLE)).toHaveAttribute("href", "/vods/shu-ana-owcs-kr-s3");
  await expect(vodsPage.getCardLink(JUNBIN_TITLE)).toHaveAttribute(
    "href",
    "/vods/junbin-winston-owcs-kr-s3",
  );
  await expect(vodsPage.getCardLink(TAEJONG_TITLE)).toHaveAttribute(
    "href",
    "/vods/taejong-tracer-owcs-kr-s3",
  );
});

test("renders YouTube hqdefault thumbnails for all 3 seeded VOD cards", async ({
  page,
  baseURL,
}) => {
  // Arrange
  const vodsPage = new VodsPage(page);
  await signUpTestUser(page, baseURL);

  // Act
  await vodsPage.goto();

  // Assert
  await expect(vodsPage.getCardThumbnail(SHU_TITLE)).toHaveAttribute(
    "src",
    "https://i.ytimg.com/vi/Ha5QwBV3Rhk/hqdefault.jpg",
  );
  await expect(vodsPage.getCardThumbnail(JUNBIN_TITLE)).toHaveAttribute(
    "src",
    "https://i.ytimg.com/vi/nkfn9HK66gg/hqdefault.jpg",
  );
  await expect(vodsPage.getCardThumbnail(TAEJONG_TITLE)).toHaveAttribute(
    "src",
    "https://i.ytimg.com/vi/w0iO_PuUxFs/hqdefault.jpg",
  );
});

test("renders metadata and skill badges on the Shu Ana VOD card", async ({ page, baseURL }) => {
  // Arrange
  const vodsPage = new VodsPage(page);
  await signUpTestUser(page, baseURL);

  // Act
  await vodsPage.goto();
  const card = vodsPage.getCard(SHU_TITLE);

  // Assert
  await expect(card).toContainText("OWCS");
  await expect(card).toContainText("4 Checkpoints");
  await expect(card).toContainText("Ana (Support) · King's Row");
  await expect(card).toContainText(/Strategy.*Tactics.*Awareness.*Tracking/u);
});

test("renders metadata and skill badges on the Junbin Winston and Taejong Tracer cards", async ({
  page,
  baseURL,
}) => {
  // Arrange
  const vodsPage = new VodsPage(page);
  await signUpTestUser(page, baseURL);

  // Act
  await vodsPage.goto();
  const junbinCard = vodsPage.getCard(JUNBIN_TITLE);
  const taejongCard = vodsPage.getCard(TAEJONG_TITLE);

  // Assert
  await expect(junbinCard).toContainText("Winston (Tank) · Lijiang Tower");
  await expect(junbinCard).toContainText(/OWCS.*4 Checkpoints/u);
  await expect(taejongCard).toContainText("Tracer (Damage) · Suravasa");
  await expect(taejongCard).toContainText(/Strategy.*Tactics.*Awareness.*Tracking/u);
});

async function signUpTestUser(page: Page, baseURL: string | undefined) {
  const authClient = new AuthClient(page);
  const response = await authClient.signUp({
    baseURL,
    email: `vods-${globalThis.crypto.randomUUID()}@example.com`,
    name: "Watchpoint Tester",
    password: "watchpoint-test-password",
  });
  if (!response.ok()) {
    throw new Error(`Test user registration failed (${response.status()})`);
  }
}
