import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	plugins: [
		tanstackStart(),
		cloudflare({
			configPath: ".config/wrangler.json",
			viteEnvironment: { name: "ssr" },
		}),
		devtools(),
		tailwindcss(),
		viteReact(),
		...(process.env.ANALYSE ? [visualizer({ open: true })] : []),
	],
});

export default config;
