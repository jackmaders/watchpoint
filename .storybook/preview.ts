import type { Preview } from "@storybook/react-vite";

import "../src/app/styles/globals.css";

const preview: Preview = {
	initialGlobals: {
		a11y: {
			manual: true,
		},
	},
	parameters: {
		a11y: {
			config: {
				runOnly: {
					type: "tag",
					values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
				},
			},
		},
		backgrounds: {
			default: "background",
			values: [{ name: "background", value: "var(--background)" }],
		},
		controls: {
			exclude: ["ref"],
			expanded: true,
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},
	},
};

export default preview;
