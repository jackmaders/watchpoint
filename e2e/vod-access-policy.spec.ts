import { execFileSync } from "node:child_process";
import { expect, type Page, test } from "@playwright/test";

const password = "e2e-password-123";
const standardVodId = `vod-e2e-access-policy-${crypto.randomUUID()}`;
const userEmail = `e2e-learner-${crypto.randomUUID()}@example.com`;

test.beforeAll(() => {
	executeLocalSql(
		`INSERT INTO vods (id, title, youtube_id, duration_seconds, is_demo, is_published, created_at, updated_at)
			 VALUES ('${standardVodId}', 'Standard Coaching VOD', 'dQw4w9WgXcQ', 300, 0, 1, 1, 1)
			 ON CONFLICT(id) DO UPDATE SET is_demo = 0, is_published = 1;`,
	);
});

test.afterAll(() => {
	executeLocalSql(
		`DELETE FROM "user" WHERE email = '${userEmail}';
		 DELETE FROM vods WHERE id = '${standardVodId}';`,
	);
});

test("anonymous visitor can access the /demo route", async ({ page }) => {
	await page.goto("/demo");

	await expect(
		page.getByRole("heading", {
			name: "Overwatch 2 - Positioning & Target Priority Guide",
		}),
	).toBeVisible();
	await expect(page.getByText("Demo Lesson", { exact: true })).toBeVisible();
});

test("anonymous visitor can access the designated demo VOD via /vods/$vodId", async ({
	page,
}) => {
	await page.goto("/vods/vod-sample-coaching-demo");

	await expect(
		page.getByRole("heading", {
			name: "Overwatch 2 - Positioning & Target Priority Guide",
		}),
	).toBeVisible();
	await expect(page.getByText("Demo Lesson", { exact: true })).toBeVisible();
});

test("anonymous visitor accessing standard VOD is redirected with return destination", async ({
	page,
}) => {
	await page.goto(`/vods/${standardVodId}`);

	await expect(page).toHaveURL(new RegExp(`returnTo=.*${standardVodId}`));
});

test("authenticated User can access published standard VOD", async ({
	page,
}) => {
	await page.goto(`/vods/${standardVodId}`);
	await expect(page).toHaveURL(new RegExp(`returnTo=.*${standardVodId}`));
	await signUp(page, userEmail);

	await expect(page).toHaveURL(new RegExp(`/vods/${standardVodId}$`));
	await expect(
		page.getByRole("heading", { name: "Standard Coaching VOD" }),
	).toBeVisible();
	await expect(
		page.getByText("Standard Lesson", { exact: true }),
	).toBeVisible();
});

test("missing VOD returns safe not-found page", async ({ page }) => {
	await page.goto("/vods/non-existent-vod-id");

	await expect(page.getByText("404 — Page not found")).toBeVisible();
});

async function signUp(page: Page, email: string) {
	await page
		.getByRole("button", { name: "Need an account? Create one" })
		.click();
	await page
		.getByRole("textbox", { name: "Name", exact: true })
		.fill("E2E Learner");
	await page.getByLabel("Email").fill(email);
	await page.getByLabel("Password").fill(password);
	await page.getByRole("button", { name: "Create account" }).click();
}

function executeLocalSql(command: string) {
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
			command,
		],
		{ stdio: "pipe" },
	);
}
