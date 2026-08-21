import { expect, test } from "@playwright/test";
import {
	assertControlReachability,
	assertNoHorizontalOverflow,
	assertVisibleFocus,
	checkRouteAccessibility,
	loadActiveWaivers,
} from "./a11y-helpers";
import { adminStoragePath } from "./auth-constants";

const waivers = loadActiveWaivers();

test.describe("Administrator Routes Accessibility & Responsive Validation", () => {
	test.use({ storageState: adminStoragePath });

	test("admin overview (/admin) meets accessibility standards", async ({
		page,
	}) => {
		await page.goto("/admin");
		await page.waitForLoadState("networkidle");

		await checkRouteAccessibility(page, {
			route: "/admin",
			state: "default",
			waivers,
		});
		await assertNoHorizontalOverflow(page);
	});

	test("admin audit log (/admin/audit) meets accessibility standards", async ({
		page,
	}) => {
		await page.goto("/admin/audit");
		await page.waitForLoadState("networkidle");

		await checkRouteAccessibility(page, {
			route: "/admin/audit",
			state: "default",
			waivers,
		});
		await assertNoHorizontalOverflow(page);
	});

	test("admin user management (/admin/users) meets accessibility standards", async ({
		page,
	}) => {
		await page.goto("/admin/users");
		await page.waitForLoadState("networkidle");

		await checkRouteAccessibility(page, {
			route: "/admin/users",
			state: "default",
			waivers,
		});
		await assertNoHorizontalOverflow(page);
	});

	test("admin content catalog (/admin/content) meets accessibility standards", async ({
		page,
	}) => {
		await page.goto("/admin/content");
		await page.waitForLoadState("networkidle");

		await checkRouteAccessibility(page, {
			route: "/admin/content",
			state: "default",
			waivers,
		});
		await assertNoHorizontalOverflow(page);
	});

	test("admin create content (/admin/content/new) validation errors meet accessibility standards", async ({
		page,
	}) => {
		await page.goto("/admin/content/new");
		await page.waitForLoadState("networkidle");

		await checkRouteAccessibility(page, {
			route: "/admin/content/new",
			state: "default",
			waivers,
		});
		await assertNoHorizontalOverflow(page);

		const submitButton = page.getByRole("button", {
			name: /create vod|save|submit/i,
		});
		await expect(submitButton).toBeVisible();
		await assertControlReachability(submitButton);
		await assertVisibleFocus(submitButton);

		await submitButton.click();
		await checkRouteAccessibility(page, {
			route: "/admin/content/new",
			state: "validation_error",
			waivers,
		});
	});

	test("admin edit content (/admin/content/vod_local_fixture) meets accessibility standards", async ({
		page,
	}) => {
		await page.goto("/admin/content/vod_local_fixture");
		await page.waitForLoadState("networkidle");

		await checkRouteAccessibility(page, {
			route: "/admin/content/$vodId",
			state: "default",
			waivers,
		});
		await assertNoHorizontalOverflow(page);
	});
});
