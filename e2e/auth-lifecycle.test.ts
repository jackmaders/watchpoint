import { expect, type Page, test } from "@playwright/test";

const registrationEnabled =
	process.env.BETTER_AUTH_ALLOW_REGISTRATION === "true";
const fixtureVodId = "vod_local_fixture";
async function openAuthModal(page: Page) {
	await page.waitForLoadState("networkidle");
	await page.getByRole("button", { exact: true, name: "Sign in" }).click();
	const dialog = page.getByRole("dialog");
	await expect(dialog).toBeVisible();
	return dialog;
}

test("completes the player account lifecycle across protected training", async ({
	context,
	page,
}) => {
	if (!registrationEnabled) {
		// biome-ignore lint/suspicious/noSkippedTests: registration is intentionally unavailable in this environment.
		test.skip(
			true,
			"Registration scenario skipped: BETTER_AUTH_ALLOW_REGISTRATION is not true in this test environment.",
		);
	}

	const uniquePlayer = {
		email: `e2e-${Date.now()}@local.watchpoint`,
		name: "E2E Lifecycle Player",
		password: "e2e-lifecycle-password",
	};

	await context.clearCookies();
	await page.goto(`/vods/${fixtureVodId}`);
	await expect.poll(async () => (await context.cookies()).length).toBe(0);
	await page.waitForLoadState("networkidle");
	const requestedTraining = page.getByRole("link", {
		name: "Start Training Session",
	});
	await requestedTraining.click();
	const dialog = page.getByRole("dialog");
	await expect(dialog).toBeVisible();
	await expect(dialog.getByRole("tab", { name: "Sign in" })).toBeVisible();
	await expect(dialog.locator(":focus")).toHaveCount(1);
	await expect(dialog).toHaveAccessibleName(/welcome back, player/i);

	await dialog.getByRole("tab", { name: "Register" }).click();
	await expect(
		dialog.getByLabel("Display name", { exact: true }),
	).toBeVisible();
	await expect(dialog.getByText("Use at least 8 characters.")).toBeVisible();
	await dialog
		.getByLabel("Display name", { exact: true })
		.fill(uniquePlayer.name);
	await dialog.getByLabel("Email", { exact: true }).fill(uniquePlayer.email);
	await dialog
		.getByLabel("Password", { exact: true })
		.fill(uniquePlayer.password);
	await dialog.getByRole("button", { name: "Create account" }).click();
	await expect(dialog).toBeHidden();

	await expect(page).toHaveURL(new RegExp(`/vods/${fixtureVodId}/session`));
	await expect(
		page.getByRole("heading", { name: /local synthetic vod fixture/i }),
	).toBeVisible();

	await page.goto("/");
	await expect(
		page.getByText(uniquePlayer.name, { exact: true }),
	).toBeVisible();
	await page.getByRole("link", { name: "View Full Catalog" }).click();
	await expect(page).toHaveURL(/\/vods$/);
	await expect(
		page.getByRole("link", { name: "Start Training" }),
	).toBeVisible();

	const protectedManifest = await context.request.get(
		`/api/vods/${fixtureVodId}/manifest`,
	);
	await expect(protectedManifest).toBeOK();

	const alteredIdentifier = await context.request.get(
		"/api/vods/not-an-owned-playthrough/manifest",
	);
	await expect(alteredIdentifier.status()).toBe(404);

	await page.goto("/");
	await expect(
		page.getByText(uniquePlayer.name, { exact: true }),
	).toBeVisible();
	await page.getByRole("button", { name: "Sign out" }).click();
	await expect(
		page.getByRole("button", { exact: true, name: "Sign in" }),
	).toBeVisible();

	await page.goto(`/vods/${fixtureVodId}`);
	await page.waitForLoadState("networkidle");
	await page.getByRole("link", { name: "Start Training Session" }).click();
	await expect(page.getByRole("dialog")).toBeVisible();

	const invalidDialog = page.getByRole("dialog");
	await invalidDialog
		.getByLabel("Email", { exact: true })
		.fill(uniquePlayer.email);
	await invalidDialog
		.getByLabel("Password", { exact: true })
		.fill("incorrect-password");
	await invalidDialog
		.getByRole("button", { exact: true, name: "Sign in" })
		.click();
	await expect(invalidDialog.getByRole("alert")).toHaveText(
		"Invalid email or password. Please check your details and try again.",
	);
	await invalidDialog
		.getByLabel("Password", { exact: true })
		.fill(uniquePlayer.password);
	await invalidDialog
		.getByRole("button", { exact: true, name: "Sign in" })
		.click();
	await expect(invalidDialog).toBeHidden();
	await page.goto("/");
	await expect(
		page.getByText(uniquePlayer.name, { exact: true }),
	).toBeVisible();

	await context.clearCookies();
	await page.goto(`/vods/${fixtureVodId}`);
	await page.waitForLoadState("networkidle");
	await page.getByRole("link", { name: "Start Training Session" }).click();
	const expiredDialog = page.getByRole("dialog");
	await expect(expiredDialog).toBeVisible();
	await expect(expiredDialog.getByRole("status")).toHaveCount(0);
	await expect(expiredDialog.locator(":focus")).toHaveCount(1);
});

test("keeps sign-in available when registration is disabled", async ({
	page,
}) => {
	// biome-ignore lint/suspicious/noSkippedTests: this scenario only applies when the server gate is disabled.
	test.skip(
		registrationEnabled,
		"Registration-gate scenario skipped: BETTER_AUTH_ALLOW_REGISTRATION is true in this test environment.",
	);

	await page.goto("/");
	const dialog = await openAuthModal(page);
	await expect(dialog.getByRole("tab", { name: "Sign in" })).toBeEnabled();
	await expect(dialog.getByRole("tab", { name: "Register" })).toBeDisabled();
	await expect(dialog.getByRole("status")).toHaveText(
		"Registration is currently unavailable. Existing players can still sign in.",
	);

	await expect(dialog.getByLabel("Email", { exact: true })).toBeVisible();
	await expect(dialog.getByLabel("Password", { exact: true })).toBeVisible();
});
