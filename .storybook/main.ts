import type { StorybookConfig } from "@storybook/react-vite";
import type { PluginOption } from "vite";

function withoutTanStackStart(plugins: PluginOption[]): PluginOption[] {
	return plugins.flatMap((plugin) => {
		if (Array.isArray(plugin)) return withoutTanStackStart(plugin);
		return plugin?.name?.includes("tanstack") ? [] : [plugin];
	});
}

const config: StorybookConfig = {
	addons: ["@storybook/addon-a11y"],
	framework: {
		name: "@storybook/react-vite",
		options: {},
	},
	stories: ["../src/shared/ui/__stories__/**/*.stories.@(ts|tsx)"],
	viteFinal: async (config) => ({
		...config,
		plugins: config.plugins
			? withoutTanStackStart(config.plugins)
			: config.plugins,
	}),
};

export default config;
