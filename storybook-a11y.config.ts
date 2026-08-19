import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./storybook",
	testMatch: "**/*.a11y.test.ts",
	use: {
		...devices["Desktop Chrome"],
		baseURL: "http://127.0.0.1:6106",
		screenshot: "only-on-failure",
		trace: "retain-on-failure",
	},
	webServer: {
		command: "bun scripts/serve-storybook.ts",
		port: 6106,
		reuseExistingServer: !process.env.CI,
	},
});
