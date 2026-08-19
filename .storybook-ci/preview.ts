import type { Preview } from "@storybook/react-vite";

import preview from "../.storybook/preview";

const ciPreview: Preview = {
	...preview,
	initialGlobals: {
		...preview.initialGlobals,
		a11y: {
			...preview.initialGlobals?.a11y,
			manual: true,
		},
	},
};

export default ciPreview;
