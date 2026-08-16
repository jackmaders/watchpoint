import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	build: {
		rollupOptions: {
			onwarn(warning, defaultHandler) {
				if (
					warning.message?.includes(
						"has been externalized for browser compatibility",
					)
				) {
					return;
				}
				defaultHandler(warning);
			},
		},
	},
	plugins: [
		tanstackStart({
			srcDirectory: "app",
		}),
		viteReact(),
		tailwindcss(),
	],
	resolve: {
		tsconfigPaths: true,
	},
	server: {
		port: 3000,
	},
});
