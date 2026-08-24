import fsd from "@feature-sliced/steiger-plugin";

export default [
	...fsd.configs.recommended,
	{
		files: ["./src/widgets/admin-layout/**"],
		rules: {
			"fsd/insignificant-slice": "off",
		},
	},
];
