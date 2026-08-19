import type { StorybookConfig } from "@storybook/react-vite";
import type { Plugin, PluginOption } from "vite";

const tanStackStartPluginPrefixes = [
	"start-client-tree-plugin",
	"tanstack-router",
	"tanstack-start",
	"tanstack:",
] as const;

function isTanStackStartPlugin(plugin: Plugin): boolean {
	return tanStackStartPluginPrefixes.some((prefix) =>
		plugin.name.startsWith(prefix),
	);
}

function withoutTanStackStart(plugins: PluginOption[]): PluginOption[] {
	return plugins.flatMap((plugin) => {
		if (Array.isArray(plugin)) return withoutTanStackStart(plugin);
		if (!plugin || typeof plugin !== "object") return [];
		return isTanStackStartPlugin(plugin) ? [] : [plugin];
	});
}

const config: StorybookConfig = {
	addons:
		process.env.STORYBOOK_A11Y_TEST === "true" ? [] : ["@storybook/addon-a11y"],
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
