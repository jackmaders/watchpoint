import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { Button } from "./button";

const meta = {
	args: {
		children: "Button",
		onClick: fn(),
	},
	argTypes: {
		asChild: { control: "boolean" },
		size: {
			control: "select",
			options: ["default", "sm", "lg", "icon"],
		},
		variant: {
			control: "select",
			options: [
				"default",
				"destructive",
				"ghost",
				"link",
				"outline",
				"secondary",
			],
		},
	},
	component: Button,
	title: "Shared UI / Button",
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Destructive: Story = {
	args: { children: "Delete", variant: "destructive" },
};

export const Ghost: Story = { args: { variant: "ghost" } };

export const Link: Story = {
	args: { children: "Learn more", variant: "link" },
};

export const Outline: Story = { args: { variant: "outline" } };

export const Secondary: Story = { args: { variant: "secondary" } };

export const Small: Story = { args: { children: "Small", size: "sm" } };

export const Large: Story = { args: { children: "Large", size: "lg" } };

export const Icon: Story = { args: { "aria-label": "Settings", size: "icon" } };

export const Disabled: Story = {
	args: { children: "Unavailable", disabled: true },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const button = canvas.getByRole("button", { name: "Unavailable" });

		await expect(button).toBeDisabled();
	},
};

export const AsChild: Story = {
	args: {
		asChild: true,
		children: <a href="/settings">Settings</a>,
		onClick: fn(),
		variant: "outline",
	},
	play: async ({ args, canvasElement }) => {
		const canvas = within(canvasElement);
		const link = canvas.getByRole("link", { name: "Settings" });

		await userEvent.tab();
		await expect(link).toHaveFocus();
		await expect(link).toHaveAttribute("href", "/settings");
		await userEvent.keyboard("{Enter}");
		await expect(args.onClick).toHaveBeenCalledOnce();
	},
};

export const KeyboardActivation: Story = {
	args: { children: "Activate" },
	play: async ({ args, canvasElement }) => {
		const canvas = within(canvasElement);
		const button = canvas.getByRole("button", { name: "Activate" });

		await userEvent.tab();
		await expect(button).toHaveFocus();
		await userEvent.keyboard("{Enter}");
		await expect(args.onClick).toHaveBeenCalledOnce();
	},
};
