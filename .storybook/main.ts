import type { StorybookConfig } from "@storybook/react-vite";

const isTanStackPlugin = (name?: string) =>
	/^start-client-tree-plugin|^tanstack(-|:)/.test(name ?? "");

const config: StorybookConfig = {
	addons: ["@storybook/addon-a11y"],
	framework: {
		name: "@storybook/react-vite",
		options: {},
	},
	stories: ["../src/shared/ui/__stories__/**/*.stories.@(ts|tsx)"],
	viteFinal: async (config) => ({
		...config,
		plugins: (config.plugins ?? [])
			.flat(Infinity)
			.filter((p) => p && typeof p === "object" && !isTanStackPlugin(p.name)),
	}),
};

export default config;
