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
				"src/**/index.ts",
				"src/**/index.client.ts",
				"src/**/index.server.ts",
				"src/app/**",
			],
			// Scoped to the new agent pipeline, not all of scripts/ — the old
			// pipeline under scripts/*.ts (agent-itemizer.ts, agent-planner.ts,
			// agent-shared.ts) is torn down in issue #493, not covered here.
			include: ["src/**/*.{ts,tsx}", "scripts/agents/**/*.ts"],
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
		// (CODING_STANDARDS.md — "No console output in tests"). Agent scripts
		// route their logging through scripts/agents/logger.ts, which is silent
		// under NODE_ENV=test, so this only ever fires on a genuine regression.
		onConsoleLog(log, type) {
			throw new Error(
				`Unexpected console output detected during test execution (${type}):\n${log}`,
			);
		},
		testTimeout: 500,
	},
});
