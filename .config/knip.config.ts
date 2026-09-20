import type { KnipConfig } from "knip";

const ignoreDependencies = ["cloudflare"];

if (!process.env.CI) {
	ignoreDependencies.push("lefthook");
}

const config: KnipConfig = {
	entry: [
		"src/app/routes/**/*.tsx!",
		"src/app/routeTree.gen.ts!",
		".config/steiger.config.ts",
		"e2e/**/*.{ts,tsx}",
	],
	project: [
		".config/**/*.{ts,tsx}",
		"src/**/*.{ts,tsx,css}!",
		"e2e/**/*.{ts,tsx}",
		"__mocks__/**/*.{ts,tsx}",
		"!src/app/routeTree.gen.ts",
		"!src/cloudflare-env.d.ts",
	],

	ignoreDependencies,

	ignoreExportsUsedInFile: true,
	treatConfigHintsAsErrors: true,
	rules: {
		files: "error",
		dependencies: "error",
		devDependencies: "error",
		unlisted: "error",
		binaries: "error",
		unresolved: "error",
		exports: "error",
		types: "error",
		enumMembers: "error",
		namespaceMembers: "error",
		cycles: "error",
		duplicates: "warn",
	},

	biome: { config: [".config/biome.json"] },
	drizzle: { config: [".config/drizzle.config.ts"] },
	lefthook: { config: [".config/lefthook.yml"] },
	playwright: { config: [".config/playwright.config.ts"] },
	vite: { config: [".config/vite.config.ts"] },
	vitest: { config: [".config/vitest.config.ts"] },
	wrangler: { config: [".config/wrangler.json"] },
};

export default config;
