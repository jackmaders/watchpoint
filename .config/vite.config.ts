import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";
import { rolldownOptions } from "./rolldown.config.ts";

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	build: { rolldownOptions },
	environments: {
		ssr: { build: { chunkSizeWarningLimit: 1500 } },
	},
	plugins: [
		cloudflare({
			configPath: ".config/wrangler.json",
			viteEnvironment: { name: "ssr" },
		}),
		tanstackStart({
			client: { entry: "app/client" },
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
	],
});

export default config;
