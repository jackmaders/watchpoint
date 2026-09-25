import { execFileSync } from "node:child_process";
import { expect, type Page, test } from "@playwright/test";

const password = "e2e-password-123";
const homeUrlPattern = /\/$/;

test("anonymous visitors cannot enter the Admin workspace", async ({
	page,
}) => {
	await page.goto("/admin");

	await expect(page).toHaveURL(homeUrlPattern);
});

test("regular Users cannot enter the Admin workspace", async ({ page }) => {
	const email = `e2e-user-${crypto.randomUUID()}@example.com`;

	await signUp(page, email);
	await page.goto("/admin");

	await expect(page).toHaveURL(homeUrlPattern);
});

test("Admins can enter the Admin workspace", async ({ page }) => {
	// biome-ignore lint/suspicious/noSkippedTests: remote deployments cannot be promoted through local D1.
	test.skip(
		Boolean(process.env.E2E_BASE_URL),
		"The Admin role promotion uses the local D1 database.",
	);

	const email = `e2e-admin-${crypto.randomUUID()}@example.com`;

	await signUp(page, email);
	promoteToAdmin(email);
	await page.goto("/admin");

	await expect(
		page.getByRole("heading", { name: "VOD authoring" }),
	).toBeVisible();
});

async function signUp(page: Page, email: string) {
	await page.goto("/");
	await page
		.getByRole("button", { name: "Need an account? Create one" })
		.click();
	await page
		.getByRole("textbox", { name: "Name", exact: true })
		.fill("E2E Admin Access");
	await page.getByLabel("Email").fill(email);
	await page.getByLabel("Password").fill(password);
	await page.getByRole("button", { name: "Create account" }).click();
	await expect(page.getByText("Signed in", { exact: true })).toBeVisible();
}

function promoteToAdmin(email: string) {
	execFileSync(
		"bun",
		[
			"x",
			"wrangler",
			"d1",
			"execute",
			"DB",
			"--local",
			"--persist-to",
			".wrangler/state",
			"-c",
			".config/wrangler.json",
			"--command",
			`UPDATE user SET role = 'admin' WHERE email = '${email}';`,
		],
		{ stdio: "pipe" },
	);
}
