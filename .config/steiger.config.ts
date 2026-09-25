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
	{
		// Steiger doesn't count the intentional Skill @x/VOD reference as a slice consumer.
		files: ["../src/entities/skill/**"],
		rules: { "fsd/insignificant-slice": "off" },
	},

	{
		files: ["../src/app/routes/api/**"],
		rules: { "fsd/no-reserved-folder-names": "off" },
	},
]);
