// e2e/smoke.spec.ts
import { expect, test } from "@playwright/test";

test.describe("Home page", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		await page.locator('html[data-hydrated="true"]').waitFor();
	});

	test("renders the signal desk heading", async ({ page }) => {
		const heading = page.getByRole("heading", {
			name: "Keep the important signal in sight.",
			level: 1,
		});
		await expect(heading).toBeVisible();
	});

	test("shows the configured stack", async ({ page }) => {
		await expect(
			page.getByText("Cloudflare D1", { exact: true }),
		).toBeVisible();
		await expect(page.getByText("Better Auth", { exact: true })).toBeVisible();
		await expect(page.getByText("shadcn/ui", { exact: true })).toBeVisible();
	});
});
