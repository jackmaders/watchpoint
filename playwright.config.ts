import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	forbidOnly: !!process.env.CI,
	fullyParallel: true,
	projects: [
		{ name: "chromium", use: { ...devices["Desktop Chrome"] } },
		{ name: "firefox", use: { ...devices["Desktop Firefox"] } },
	],
	reporter: [["list"], ["html", { open: "never" }]],
	retries: process.env.CI ? 2 : 0,
	testDir: "./e2e",
	testIgnore: ["**/*.a11y.test.ts"],
	testMatch: "**/*.test.ts",
	use: {
		baseURL: process.env.BASE_URL || "http://localhost:3000",
		screenshot: "only-on-failure",
		trace: "on-first-retry",
	},
	webServer: {
		command: "bun run dev",
		env: {
			BETTER_AUTH_ALLOW_REGISTRATION: "true",
			BETTER_AUTH_SECRET: "development-secret-key-at-least-32-chars-long",
			BETTER_AUTH_URL: process.env.BASE_URL || "http://localhost:3000",
		},
		url: "http://localhost:3000",
	},
});
