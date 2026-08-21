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
				"**/__stories__/**",
				"**/*.d.ts",
				"src/**/*.stories.{ts,tsx}",
				"src/**/*.{spec,test}.{ts,tsx}",
				"src/**/index.ts",
				"src/**/index.client.ts",
				"src/**/index.server.ts",
				"src/app/**",
				"src/pages/prototype-*/**",
				"src/pages/vod-detail/ui/session-player-media-recovery-prototype.tsx",
			],
			include: ["src/**/*.{ts,tsx}"],
			reporter: ["text-summary", "text"],
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
			".output/**",
			".nitro/**",
			".vinxi/**",
			".next/**",
			".wrangler/**",
			".claude/**",
			".agents/**",
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
		setupFiles: ["./vitest.setup.ts"],
		testTimeout: 500,
	},
});
