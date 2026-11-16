import { expect, test } from "./fixtures";
import { AuthClient, HomePage } from "./page-objects";

test("creates an account through the form, signs out and signs back in", async ({
  page,
}, testInfo) => {
  const home = new HomePage(page);
  const email = `review-${globalThis.crypto.randomUUID()}@example.com`;
  const password = "watchpoint-review-password";

  await test.step("register through the landing form", async () => {
    await home.goto();
    await page.screenshot({
      animations: "disabled",
      fullPage: true,
      path: testInfo.outputPath("home-desktop.png"),
    });
    await home.switchToSignUp();
    await home.nameInput.fill("Morgan Review");
    await home.emailInput.fill(email);
    await home.passwordInput.fill(password);
    await home.submitButton.click();
    await expect(
      page.getByRole("main").getByRole("heading", { name: "VOD Catalogue" }),
    ).toBeVisible();
  });

  await test.step("cancel then confirm sign out", async () => {
    await page.getByRole("button", { exact: true, name: "Sign Out" }).click();
    await expect(page.getByRole("dialog", { name: "Sign out?" })).toBeVisible();
    await page.getByRole("button", { exact: true, name: "Cancel" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await page.getByRole("button", { exact: true, name: "Sign Out" }).click();
    await page.getByRole("dialog").getByRole("button", { exact: true, name: "Sign Out" }).click();
    await expect(home.signInHeading).toBeVisible();
  });

  await home.emailInput.fill(email);
  await home.passwordInput.fill(password);
  await home.passwordInput.press("Enter");
  await expect(page).toHaveURL(/\/vods$/u);
});

test("shows the signed in user's profile after direct navigation", async ({
  page,
  baseURL,
}, testInfo) => {
  const email = `profile-${globalThis.crypto.randomUUID()}@example.com`;
  const response = await new AuthClient(page).signUp({ baseURL, email, name: "Morgan Review" });
  expect(response.ok()).toBe(true);
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "User Profile" })).toBeVisible();
  await page.screenshot({
    animations: "disabled",
    fullPage: true,
    path: testInfo.outputPath("profile-desktop.png"),
  });
  await expect(page.getByRole("main")).toContainText(email);
});
