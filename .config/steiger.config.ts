import fsd from "@feature-sliced/steiger-plugin";
import { defineConfig } from "steiger";

export default defineConfig([
	...fsd.configs.recommended,
	{
		ignores: ["../**/__mocks__/**", "../src/entities/lesson/**/__tests__/**"],
	},
	{
		files: ["../src/features/**", "../src/widgets/**"],
		rules: { "fsd/insignificant-slice": "off" },
	},
	{
		// Lesson server APIs land before the runner UI in the next implementation ticket.
		files: ["../src/entities/lesson/**"],
		rules: { "fsd/insignificant-slice": "off" },
	},

	{
		files: ["../src/app/routes/api/**"],
		rules: { "fsd/no-reserved-folder-names": "off" },
	},
]);
