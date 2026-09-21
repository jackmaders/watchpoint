import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env.CI);
const externalBaseURL = process.env.E2E_BASE_URL?.trim() || undefined;
const usePreview = process.env.E2E_USE_PREVIEW === "true";
const skipBuild = process.env.E2E_SKIP_BUILD === "true";
const serverMode = externalBaseURL
	? "external"
	: usePreview
		? "preview"
		: "dev";

if (skipBuild && serverMode !== "preview") {
	throw new Error("E2E_SKIP_BUILD=true requires E2E_USE_PREVIEW=true");
}

const baseURL =
	externalBaseURL ??
	(serverMode === "preview"
		? "http://localhost:8787"
		: "http://localhost:5173");

const webServer =
	serverMode === "external"
		? undefined
		: {
				command: [
					...(serverMode === "preview" && !skipBuild ? ["bun run build"] : []),
					"bun run db:migrate",
					serverMode === "preview" ? "bun run preview" : "bun run dev",
				].join(" && "),
				url: baseURL,
				reuseExistingServer: false,
			};

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
	webServer,
});
