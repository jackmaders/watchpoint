import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.STORYBOOK_A11Y_PORT ?? 6106);

export default defineConfig({
	reporter: [["list"], ["html", { open: "never" }]],
	testDir: "./storybook",
	testMatch: "**/*.a11y.test.ts",
	use: {
		...devices["Desktop Chrome"],
		baseURL: `http://127.0.0.1:${port}`,
		screenshot: "only-on-failure",
		trace: "retain-on-failure",
	},
	webServer: {
		command: `PORT=${port} bun scripts/serve-storybook.ts`,
		port,
		reuseExistingServer: !process.env.CI,
	},
});
