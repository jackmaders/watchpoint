import { expect, test } from "@playwright/test";

test("should load home page", async ({ page }) => {
	await page.goto("/");
	await expect(page).toHaveTitle(/Next/i);
});
