import { existsSync, mkdirSync } from "node:fs";
import { expect, test as setup } from "@playwright/test";
import { getSeedCredentials } from "../../../src/shared/db";
import {
	adminStoragePath,
	authDir,
	playerStoragePath,
} from "../auth-constants";

if (!existsSync(authDir)) {
	mkdirSync(authDir, { recursive: true });
}

setup("authenticate as local player", async ({ context, page }) => {
	await context.clearCookies();
	const creds = getSeedCredentials();
	await page.goto("/");
	await page.waitForLoadState("networkidle");

	await page.getByRole("button", { exact: true, name: "Sign in" }).click();
	const dialog = page.getByRole("dialog");
	await expect(dialog).toBeVisible();

	await dialog.getByLabel("Email", { exact: true }).fill(creds.playerEmail);
	await dialog
		.getByLabel("Password", { exact: true })
		.fill(creds.playerPassword);
	await dialog.getByRole("button", { exact: true, name: "Sign in" }).click();

	await expect(dialog).toBeHidden({ timeout: 15000 });
	await context.storageState({ path: playerStoragePath });
});

setup("authenticate as local admin", async ({ context, page }) => {
	await context.clearCookies();
	const creds = getSeedCredentials();
	await page.goto("/");
	await page.waitForLoadState("networkidle");

	await page.getByRole("button", { exact: true, name: "Sign in" }).click();
	const dialog = page.getByRole("dialog");
	await expect(dialog).toBeVisible();

	await dialog.getByLabel("Email", { exact: true }).fill(creds.adminEmail);
	await dialog
		.getByLabel("Password", { exact: true })
		.fill(creds.adminPassword);
	await dialog.getByRole("button", { exact: true, name: "Sign in" }).click();

	await expect(dialog).toBeHidden({ timeout: 15000 });
	await context.storageState({ path: adminStoragePath });
});
