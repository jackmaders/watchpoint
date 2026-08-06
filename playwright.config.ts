import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	forbidOnly: !!process.env.CI,
	fullyParallel: true,
	projects: [
		{ name: "chromium", use: { ...devices["Desktop Chrome"] } },
		{ name: "firefox", use: { ...devices["Desktop Firefox"] } },
	],
	reporter: process.env.CI
		? [["html", { open: "never" }]]
		: [["html", { open: "on-failure" }]],
	retries: process.env.CI ? 2 : 0,
	testDir: "./e2e",
	testMatch: "**/*.test.ts",
	use: {
		baseURL: process.env.BASE_URL || "http://localhost:3000",
		screenshot: "only-on-failure",
		trace: "on-first-retry",
	},
	webServer: {
		command: process.env.CI ? "bun run start" : "bun run dev",
		reuseExistingServer: !process.env.CI,
		timeout: 360_000,
		url: "http://localhost:3000",
	},
});
