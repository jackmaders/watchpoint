import { expect, test } from "@playwright/test";
import {
	assertControlReachability,
	assertNoHorizontalOverflow,
	assertVisibleFocus,
	checkRouteAccessibility,
	loadActiveWaivers,
} from "./a11y-helpers";

const waivers = loadActiveWaivers();

test.describe("Public Routes Accessibility & Responsive Validation", () => {
	test("home page (/) meets WCAG 2.2 AA and responsive standards", async ({
		page,
	}) => {
		await page.goto("/");
		await page.waitForLoadState("networkidle");

		await checkRouteAccessibility(page, {
			route: "/",
			state: "default",
			waivers,
		});
		await assertNoHorizontalOverflow(page);

		const ctaLink = page.getByRole("link", { name: /view full catalog/i });
		await assertControlReachability(ctaLink);
		await assertVisibleFocus(ctaLink);
	});

	test("home page (/) server-error state remains accessible", async ({
		page,
	}) => {
		await page.route("/api/**", async (route) => {
			await route.fulfill({
				body: JSON.stringify({ error: "Internal Server Error" }),
				status: 500,
			});
		});

		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		await checkRouteAccessibility(page, {
			route: "/",
			state: "server_error",
			waivers,
		});
		await assertNoHorizontalOverflow(page);
	});

	test("VOD catalog (/vods) default, loading, and empty states meet WCAG 2.2 AA", async ({
		page,
	}) => {
		await page.goto("/vods");
		await page.waitForLoadState("networkidle");

		await checkRouteAccessibility(page, {
			route: "/vods",
			state: "default",
			waivers,
		});
		await assertNoHorizontalOverflow(page);

		// Test search filtering for empty state
		const searchInput = page.getByRole("textbox", {
			name: /filter|search/i,
		});
		await expect(searchInput).toBeVisible();
		await assertControlReachability(searchInput);
		await assertVisibleFocus(searchInput);

		await searchInput.fill("NonExistentMatchingQueryXYZ12345");
		await page.waitForTimeout(300);

		await checkRouteAccessibility(page, {
			route: "/vods",
			state: "empty",
			waivers,
		});
		await assertNoHorizontalOverflow(page);
	});

	test("VOD detail page (/vods/vod_local_fixture) meets WCAG 2.2 AA and responsive standards", async ({
		page,
	}) => {
		await page.goto("/vods/vod_local_fixture");
		await page.waitForLoadState("networkidle");

		await checkRouteAccessibility(page, {
			route: "/vods/$id",
			state: "default",
			waivers,
		});
		await assertNoHorizontalOverflow(page);

		const startTrainingLink = page.getByRole("link", {
			name: /start training/i,
		});
		await assertControlReachability(startTrainingLink);
		await assertVisibleFocus(startTrainingLink);
	});
});
