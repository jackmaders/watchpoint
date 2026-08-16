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

	{
		// Tell Steiger to treat _app as a sliceless layer by disabling
		// the segmentless-slices rule exclusively for this directory.
		files: ["./src/_app/**", "./src/_pages/**"],
		rules: {
			"fsd/no-segmentless-slices": "off",
		},
	},

	{
		// Entities represent domain concepts that may initially have a single consumer
		// before additional features (e.g. scorecard, overlay) are integrated.
		files: ["./src/entities/**"],
		rules: {
			"fsd/insignificant-slice": "off",
		},
	},
	{
		// Tests may import adjacent manual mocks directly; these are not production dependencies.
		files: ["./src/**/__tests__/**"],
		rules: {
			"fsd/no-public-api-sidestep": "off",
		},
	},
];
