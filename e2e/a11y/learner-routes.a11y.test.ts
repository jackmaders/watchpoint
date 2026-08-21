import { test } from "@playwright/test";
import {
	assertControlReachability,
	assertNoHorizontalOverflow,
	assertVisibleFocus,
	checkRouteAccessibility,
	loadActiveWaivers,
} from "./a11y-helpers";
import { playerStoragePath } from "./auth-constants";

const waivers = loadActiveWaivers();

test.describe("Learner Protected Routes Accessibility & Responsive Validation", () => {
	test.use({ storageState: playerStoragePath });

	test("training session player (/vods/vod_local_fixture/session) meets accessibility standards", async ({
		page,
	}) => {
		await page.goto("/vods/vod_local_fixture/session");
		await page.waitForLoadState("networkidle");

		await checkRouteAccessibility(page, {
			route: "/vods/$id/session",
			state: "default",
			waivers,
		});
		await assertNoHorizontalOverflow(page);
	});

	test("history list page (/history) meets accessibility and responsive standards", async ({
		page,
	}) => {
		await page.goto("/history");
		await page.waitForLoadState("networkidle");

		await checkRouteAccessibility(page, {
			route: "/history",
			state: "default",
			waivers,
		});
		await assertNoHorizontalOverflow(page);
	});

	test("history detail page (/history/playthrough_local_fixture) meets accessibility standards", async ({
		page,
	}) => {
		await page.goto("/history/playthrough_local_fixture");
		await page.waitForLoadState("networkidle");

		await checkRouteAccessibility(page, {
			route: "/history/$playthroughId",
			state: "default",
			waivers,
		});
		await assertNoHorizontalOverflow(page);

		const backLink = page.getByRole("link", { name: /back to history/i });
		if (await backLink.isVisible()) {
			await assertControlReachability(backLink);
			await assertVisibleFocus(backLink);
		}
	});
});
