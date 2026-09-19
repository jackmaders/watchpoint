import { expect, test } from "@playwright/test";

test("creates and reads a post from D1", async ({ page }) => {
	const postName = `E2E post ${Date.now()}`;

	await page.goto("/");

	await page.getByLabel("Post name").fill(postName);
	await page.getByRole("button", { name: "Add post" }).click();

	await expect(page.getByText(postName, { exact: true })).toBeVisible();
	await expect(page.getByText(/^Posts in D1: \d+$/)).toBeVisible();
});
