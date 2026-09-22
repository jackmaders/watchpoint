import { cloudflare } from "@cloudflare/vite-plugin";
import { sentryTanstackStart } from "@sentry/tanstackstart-react/vite";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig, loadEnv } from "vite";

const sentryModulePath = /[\\/]node_modules[\\/]@sentry[\\/]/;

const config = defineConfig(({ mode }) => {
	const env = loadEnv(mode, ".", "");
	const sentryDsn = process.env.SENTRY_DSN ?? env.SENTRY_DSN;

	return {
		define: {
			"import.meta.env.VITE_SENTRY_DSN": JSON.stringify(sentryDsn ?? ""),
		},
		resolve: { tsconfigPaths: true },
		build: {
			rolldownOptions: {
				output: {
					manualChunks(id) {
						if (sentryModulePath.test(id)) {
							return "sentry";
						}
					},
				},
			},
		},
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
				org: process.env.SENTRY_ORG,
				project: process.env.SENTRY_PROJECT,
				authToken: process.env.SENTRY_AUTH_TOKEN,
				autoInstrumentMiddleware: false,
			}),
		],
	};
});

export default config;
