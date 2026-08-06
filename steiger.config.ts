import fsd from "@feature-sliced/steiger-plugin";

export default [
	...fsd.configs.recommended,
	{
		rules: {
			// _pages is the intentional FSD naming convention for Next.js App Router
			// to avoid conflicting with the Next.js pages/ directory.
			// See: https://feature-sliced.design/docs/guides/tech/with-nextjs
			"fsd/typo-in-layer-name": "off",
		},
	},
];
