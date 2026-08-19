import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
	core: {
		builder: {
			name: "@storybook/builder-vite",
			options: {
				viteConfigPath: ".storybook/vite.config.ts",
			},
		},
	},
	framework: "@storybook/react-vite",
	stories: ["../src/shared/ui/**/*.stories.@(ts|tsx)"],
};

export default config;
