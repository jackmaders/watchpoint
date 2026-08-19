import type { Preview } from "@storybook/react-vite";
import "../src/app/styles/globals.css";

const preview: Preview = {
	parameters: {
		a11y: {
			config: {
				runOnly: {
					type: "tag",
					values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
				},
			},
		},
		controls: { expanded: true },
	},
};

export default preview;
