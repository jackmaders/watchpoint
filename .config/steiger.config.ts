import fsd from "@feature-sliced/steiger-plugin";
import { defineConfig } from "steiger";

export default defineConfig([
	...fsd.configs.recommended,
	{
		ignores: [
			"../**/__mocks__/**",
			"../src/cloudflare-env.d.ts",
			"../src/app/routeTree.gen.ts",
		],
	},
]);
