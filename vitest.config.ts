import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		tsconfigPaths: true,
	},
	test: {
		clearMocks: true,
		coverage: {
			exclude: [
				"**/__mocks__/**",
				"src/**/*.{spec,test}.{ts,tsx}",
				".sandcastle/**/*.{spec,test}.{ts,tsx}",
				"src/**/index.ts",
				"src/**/index.client.ts",
				"src/**/index.server.ts",
				".sandcastle/index.ts",
				".sandcastle/main.ts",
				"src/app/**",
				"src/_pages/prototype-*/**",
			],
			include: ["src/**/*.{ts,tsx}", ".sandcastle/**/*.{ts,tsx}"],
			provider: "v8",
			reporter: ["text", "html"],
			thresholds: {
				branches: 100,
				functions: 100,
				lines: 100,
				statements: 100,
			},
		},
		environment: "happy-dom",
		exclude: [
			"e2e/**",
			"node_modules/**",
			".next/**",
			".wrangler/**",
			".open-next/**",
			".claude/**",
			"dist/**",
			"generated/**",
		],
		globals: true,
		include: ["**/*.spec.{ts,tsx}"],
		maxWorkers: 2,
		// Console output during a test run is a failure, not a warning
		// (CODING_STANDARDS.md — "No console output in tests").
		onConsoleLog(log, type) {
			throw new Error(
				`Unexpected console output detected during test execution (${type}):\n${log}`,
			);
		},
		testTimeout: 500,
	},
});
