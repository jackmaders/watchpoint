import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.A11Y_PORT ?? 3000);
const baseURL = process.env.BASE_URL || `http://localhost:${port}`;

export default defineConfig({
	forbidOnly: !!process.env.CI,
	fullyParallel: false,
	projects: [
		{
			name: "setup",
			testMatch: /auth\.setup\.ts/,
		},
		{
			dependencies: ["setup"],
			name: "desktop-chrome",
			testMatch: "**/*.a11y.test.ts",
			use: {
				...devices["Desktop Chrome"],
				baseURL,
				screenshot: "only-on-failure",
				trace: "retain-on-failure",
			},
		},
		{
			dependencies: ["setup"],
			name: "mobile-320",
			testMatch: "**/*.a11y.test.ts",
			use: {
				baseURL,
				deviceScaleFactor: 2,
				hasTouch: true,
				isMobile: true,
				screenshot: "only-on-failure",
				trace: "retain-on-failure",
				viewport: { height: 640, width: 320 },
			},
		},
	],
	reporter: [
		["list"],
		["html", { open: "never", outputFolder: "a11y-report" }],
	],
	retries: process.env.CI ? 2 : 0,
	testDir: "./e2e/a11y",
	use: {
		baseURL,
	},
	webServer: {
		command: "bun run dev",
		env: {
			BETTER_AUTH_ALLOW_REGISTRATION: "true",
			BETTER_AUTH_SECRET: "development-secret-key-at-least-32-chars-long",
			BETTER_AUTH_URL: baseURL,
		},
		reuseExistingServer: !process.env.CI,
		url: baseURL,
	},
});
