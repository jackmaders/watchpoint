import { cloudflare } from "@cloudflare/vite-plugin";
import { sentryTanstackStart } from "@sentry/tanstackstart-react/vite";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	plugins: [
		cloudflare({
			configPath: ".config/wrangler.json",
			viteEnvironment: { name: "ssr" },
		}),
		tanstackStart({
			router: {
				entry: "app/router",
				generatedRouteTree: "app/routeTree.gen.ts",
				routesDirectory: "app/routes",
			},
		}),
		devtools({ injectSource: { enabled: false } }),
		tailwindcss(),
		viteReact(),
		...(process.env.ANALYSE ? [visualizer({ open: true })] : []),
		sentryTanstackStart({
			org: "___ORG_SLUG___",
			project: "___PROJECT_SLUG___",
			authToken: process.env.SENTRY_AUTH_TOKEN,
		}),
	],
});

export default config;
