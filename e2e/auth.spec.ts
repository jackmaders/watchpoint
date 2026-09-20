import { expect, type Page, test } from "@playwright/test";

const password = "e2e-password-123";

test("authenticates users and protects server functions", async ({ page }) => {
	const email = `e2e-${crypto.randomUUID()}@example.com`;
	const authenticatedPostName = `Authenticated post ${crypto.randomUUID()}`;
	const anonymousPostName = `Anonymous post ${crypto.randomUUID()}`;

	await page.goto("/");
	await page.locator('html[data-hydrated="true"]').waitFor();
	await expect(page.getByText("Access the watchpoint")).toBeVisible();

	await page
		.getByRole("button", { name: "Need an account? Create one" })
		.click();
	await page
		.getByRole("textbox", { name: "Name", exact: true })
		.fill("E2E Operator");
	await page.getByLabel("Email").fill(email);
	await page.getByLabel("Password").fill(password);

	const signUpResponsePromise = page.waitForResponse(
		(response) =>
			new URL(response.url()).pathname === "/api/auth/sign-up/email" &&
			response.request().method() === "POST",
	);
	await page.getByRole("button", { name: "Create account" }).click();
	const signUpResponse = await signUpResponsePromise;
	expect(signUpResponse.ok()).toBe(true);
	await expect(page.getByText("Signed in", { exact: true })).toBeVisible();

	const signedInSession = await readSession(page);
	expect(signedInSession?.user?.email).toBe(email);
	expect(signedInSession?.session).not.toBeNull();

	await page.getByLabel("Post name").fill(authenticatedPostName);
	await page.getByRole("button", { name: "Add post" }).click();
	await expect(
		page.getByText(authenticatedPostName, { exact: true }),
	).toBeVisible();

	const signOutResponsePromise = page.waitForResponse(
		(response) =>
			new URL(response.url()).pathname === "/api/auth/sign-out" &&
			response.request().method() === "POST",
	);
	await page.getByRole("button", { name: "Sign out" }).click();
	const signOutResponse = await signOutResponsePromise;
	expect(signOutResponse.ok()).toBe(true);
	await expect(page.getByText("Access the watchpoint")).toBeVisible();

	const signedOutSession = await readSession(page);
	expect(signedOutSession).toBeNull();

	await page.getByLabel("Post name").fill(anonymousPostName);
	await page.getByRole("button", { name: "Add post" }).click();
	await expect(page.getByRole("alert")).toHaveText(
		"Sign in to add a watchpoint.",
	);
	await expect(page.getByText(anonymousPostName, { exact: true })).toHaveCount(
		0,
	);

	await page
		.getByRole("button", { name: "Already have an account? Sign in" })
		.click();
	await page.getByLabel("Email").fill(email);
	await page.getByLabel("Password").fill(password);

	const signInResponsePromise = page.waitForResponse(
		(response) =>
			new URL(response.url()).pathname === "/api/auth/sign-in/email" &&
			response.request().method() === "POST",
	);
	await page.getByRole("button", { name: "Sign in" }).click();
	const signInResponse = await signInResponsePromise;
	expect(signInResponse.ok()).toBe(true);
	await expect(page.getByText("Signed in", { exact: true })).toBeVisible();

	const signedInAgainSession = await readSession(page);
	expect(signedInAgainSession?.user?.email).toBe(email);
	expect(signedInAgainSession?.session).not.toBeNull();
});

async function readSession(page: Page) {
	const response = await page.request.get("/api/auth/get-session");
	expect(response).toBeOK();
	return response.json();
}
