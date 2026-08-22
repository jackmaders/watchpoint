import type { StorybookConfig } from "@storybook/react-vite";
import { filterTanStackPlugins } from "./tanstack-plugin-filter.ts";

const config: StorybookConfig = {
	addons: ["@storybook/addon-a11y"],
	framework: {
		name: "@storybook/react-vite",
		options: {},
	},
	stories: ["../src/shared/ui/__stories__/**/*.stories.@(ts|tsx)"],
	viteFinal: async (config) => ({
		...config,
		plugins: filterTanStackPlugins(config.plugins),
	}),
};

export default config;
