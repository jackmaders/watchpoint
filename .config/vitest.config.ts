import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: { tsconfigPaths: true },
	test: {
		environment: "happy-dom",
		globals: true,
		include: ["src/**/__tests__/*.spec.{ts,tsx}"],
		setupFiles: ["@testing-library/jest-dom/vitest"],
	},
});
