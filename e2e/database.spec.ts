import { expect, test } from "@playwright/test";

test("creates and reads a post from D1", async ({ page }) => {
	const postName = `E2E post ${Date.now()}`;

	await page.goto("/");
	const postsCount = page.getByText(/^Posts in D1: \d+$/);
	const initialCountText = await postsCount.textContent();
	const initialCount = Number(initialCountText?.match(/\d+$/)?.[0]);
	expect(Number.isInteger(initialCount)).toBe(true);

	await page.getByLabel("Post name").fill(postName);
	await page.getByRole("button", { name: "Add post" }).click();

	await expect(page.getByText(postName, { exact: true })).toBeVisible();
	await expect
		.poll(async () => {
			const countText = await postsCount.textContent();
			return Number(countText?.match(/\d+$/)?.[0]);
		})
		.toBeGreaterThan(initialCount);
});
