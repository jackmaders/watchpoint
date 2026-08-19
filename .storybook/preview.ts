import type { Preview } from "@storybook/react-vite";

import "../src/app/styles/globals.css";

const preview: Preview = {
	parameters: {
		actions: { argTypesRegex: "^on[A-Z].*" },
		backgrounds: {
			default: "background",
			values: [{ name: "background", value: "var(--background)" }],
		},
		controls: {
			exclude: ["ref"],
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},
	},
};

export default preview;
