import { expect, test } from "@playwright/test";
import {
	assertControlReachability,
	assertModalFocusTrapping,
	assertNoHorizontalOverflow,
	assertVisibleFocus,
	checkRouteAccessibility,
	loadActiveWaivers,
} from "./a11y-helpers";

const waivers = loadActiveWaivers();

test.describe("Auth Dialog Modal & Error States Accessibility", () => {
	test("sign in dialog preserves focus trapping, visible focus, and escape semantics", async ({
		page,
	}) => {
		await page.goto("/");
		await page.waitForLoadState("networkidle");

		const signInBtn = page.getByRole("button", {
			exact: true,
			name: "Sign in",
		});
		await expect(signInBtn).toBeVisible();
		await assertControlReachability(signInBtn);
		await assertVisibleFocus(signInBtn);

		await signInBtn.click();
		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible();

		await checkRouteAccessibility(page, {
			route: "/",
			state: "modal",
			waivers,
		});

		await assertModalFocusTrapping(page, dialog);
	});

	test("unauthorized access to admin redirects or renders accessible error state", async ({
		page,
	}) => {
		// Clear cookies so user is unauthenticated
		await page.context().clearCookies();
		await page.goto("/admin");
		await page.waitForLoadState("networkidle");

		await checkRouteAccessibility(page, {
			route: "/admin",
			state: "unauthorized",
			waivers,
		});
		await assertNoHorizontalOverflow(page);
	});

	test("expired session on protected training route displays accessible state", async ({
		context,
		page,
	}) => {
		// Set an expired dummy session cookie
		await context.addCookies([
			{
				domain: "localhost",
				expires: Math.floor(Date.now() / 1000) - 3600,
				httpOnly: true,
				name: "better-auth.session_token",
				path: "/",
				sameSite: "Lax",
				value: "expired-token",
			},
		]);

		await page.goto("/vods/vod_local_fixture/session");
		await page.waitForLoadState("networkidle");

		await checkRouteAccessibility(page, {
			route: "/vods/$id/session",
			state: "expired_session",
			waivers,
		});
		await assertNoHorizontalOverflow(page);
	});
});
