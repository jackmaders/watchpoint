import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("every shared UI story has no WCAG 2.2 AA violations", async ({
	page,
	request,
}) => {
	const response = await request.get("/index.json");
	expect(response.ok()).toBe(true);
	const index = (await response.json()) as {
		entries: Record<string, { type: string }>;
	};
	const storyIds = Object.entries(index.entries)
		.filter(([, entry]) => entry.type === "story")
		.map(([id]) => id)
		.sort();
	expect(storyIds.length).toBeGreaterThan(0);

	for (const storyId of storyIds) {
		await page.goto(`/iframe.html?id=${storyId}`);
		await expect(page.locator("#storybook-root")).toBeVisible();
		const results = await new AxeBuilder({ page })
			.withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
			.analyze();
		expect(
			results.violations,
			`${storyId} has accessibility violations`,
		).toEqual([]);
	}
});

test("button stories preserve keyboard focus and activation semantics", async ({
	page,
}) => {
	await page.goto("/iframe.html?id=shared-ui-button--keyboard-interaction");
	const button = page.getByRole("button", { name: "Activate with Enter" });
	await button.focus();
	expect(
		await button.evaluate((element) => document.activeElement === element),
	).toBe(true);
	await page.keyboard.press("Enter");
	await expect(page.getByText("Activated", { exact: true })).toBeVisible();

	await page.goto(
		"/iframe.html?id=shared-ui-button--disabled-keyboard-interaction",
	);
	const disabled = page.getByRole("button", { name: "Cannot activate" });
	expect(await disabled.isDisabled()).toBe(true);
	await disabled.focus();
	expect(await disabled.isDisabled()).toBe(true);
});
