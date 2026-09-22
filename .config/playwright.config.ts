import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env.CI);
const skipBuild = process.env.E2E_SKIP_BUILD === "true";
const usePreview = process.env.E2E_USE_PREVIEW === "true";
const externalBaseURL = process.env.E2E_BASE_URL?.trim();

const devBaseURL = "http://localhost:5173";
const previewBaseURL = "http://localhost:8787";

const baseURL = externalBaseURL || (usePreview ? previewBaseURL : devBaseURL);

if (skipBuild && !usePreview) {
	throw new Error("E2E_SKIP_BUILD=true requires E2E_USE_PREVIEW=true");
}

export default defineConfig({
	testDir: "../e2e",
	fullyParallel: true,
	forbidOnly: isCI,
	retries: isCI ? 2 : 0,
	workers: isCI ? 1 : undefined,
	reporter: isCI ? "github" : "list",
	use: {
		baseURL,
		trace: "on-first-retry",
	},
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

function getWebServerConfig() {
	if (externalBaseURL) {
		return {};
	}

	const steps = ["bun run db:migrate"];

	if (usePreview && !skipBuild) {
		steps.unshift("bun run build");
	}

	if (usePreview) {
		steps.push("bun run preview");
	} else {
		steps.push("bun run dev");
	}

	return {
		webServer: {
			command: steps.join(" && "),
			url: baseURL,
			reuseExistingServer: false,
		},
	};
}
