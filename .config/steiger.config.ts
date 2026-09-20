import fsd from "@feature-sliced/steiger-plugin";
import { defineConfig } from "steiger";

export default defineConfig([
	...fsd.configs.recommended,
	{
		ignores: ["../**/__mocks__/**"],
	},
	{
		files: ["../src/features/**", "../src/widgets/**"],
		rules: { "fsd/insignificant-slice": "off" },
	},
]);
