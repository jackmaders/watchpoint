import fsd from "@feature-sliced/steiger-plugin";

export default [
	...fsd.configs.recommended,
	{
		files: ["./src/widgets/layout-admin/**"],
		rules: {
			"fsd/insignificant-slice": "off",
		},
	},
];
