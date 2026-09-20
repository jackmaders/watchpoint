// biome-ignore lint/correctness/noUnresolvedImports: Playwright provides this runtime export.
import { defineConfig, devices } from "@playwright/test";

const SKIP_BUILD = process.env.E2E_SKIP_BUILD === "true";
const USE_PREVIEW = process.env.E2E_USE_PREVIEW === "true";

const PREVIEW_BASE_URL = "http://localhost:8787";
const DEV_BASE_URL = "http://localhost:5173";
const DEFAULT_BASE_URL = USE_PREVIEW ? PREVIEW_BASE_URL : DEV_BASE_URL;

const BASE_URL = process.env.E2E_BASE_URL ?? DEFAULT_BASE_URL;

type WebServerConfig = {
	webServer?: {
		command: string;
		url: string;
		reuseExistingServer: boolean;
	};
};

/** See https://playwright.dev/docs/test-configuration. */
export default defineConfig({
	testDir: "../e2e",
	/* Run tests in files in parallel */
	fullyParallel: true,
	/* Fail the build on CI if you accidentally left test.only in the source code. */
	forbidOnly: Boolean(process.env.CI),
	/* Retry on CI only */
	retries: process.env.CI ? 2 : 0,
	/* Opt out of parallel tests on CI. */
	workers: process.env.CI ? 1 : undefined,
	/* Reporter to use. See https://playwright.dev/docs/test-reporters */
	reporter: process.env.CI ? "github" : "list",
	/* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
	use: {
		/* Base URL to use in actions like `await page.goto('')`. */
		baseURL: BASE_URL,

		/* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
		trace: "on-first-retry",
	},

	/* Configure projects for major browsers */
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},

		{
			name: "firefox",
			use: { ...devices["Desktop Firefox"] },
		},

		{
			name: "webkit",
			use: { ...devices["Desktop Safari"] },
		},
	],

	...getWebServerConfig(),
});

function getWebServerConfig(): WebServerConfig {
	if (process.env.E2E_BASE_URL) {
		return {};
	}

	const steps = [USE_PREVIEW ? "bun run preview" : "bun run dev"];
	if (USE_PREVIEW && !SKIP_BUILD) {
		steps.unshift("bun run build");
	}

	return {
		webServer: {
			command: steps.join(" && "),
			url: BASE_URL,
			reuseExistingServer: !process.env.CI,
		},
	};
}
