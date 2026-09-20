// e2e/smoke.spec.ts
import { expect, test } from "@playwright/test";

const GETTING_STARTED_TEXT_PATTERN =
	/Edit src\/app\/routes\/index\.tsx to get started\./i;

test.describe("Home page", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
	});

	test("renders the welcome heading", async ({ page }) => {
		const heading = page.getByRole("heading", {
			name: "Welcome to TanStack Start",
			level: 1,
		});
		await expect(heading).toBeVisible();
	});

	test("displays the getting started guide text", async ({ page }) => {
		const guideText = page.getByText(GETTING_STARTED_TEXT_PATTERN);
		await expect(guideText).toBeVisible();

		const codeSnippet = page.locator("code");
		await expect(codeSnippet).toHaveText("src/app/routes/index.tsx");
	});
});
