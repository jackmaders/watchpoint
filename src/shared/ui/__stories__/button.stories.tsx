/**
 * Storybook visual component documentation and interaction stories for the shared Button primitive.
 *
 * Defines stories demonstrating all button visual variants, size configurations, disabled states,
 * polymorphic link rendering via `asChild`, and accessible keyboard activation flows.
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { useCallback, useState } from "react";
import { Button } from "@/shared/ui";

const meta = {
	component: Button,
	tags: ["autodocs"],
	title: "Shared UI / Button",
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

function KeyboardActivationExample() {
	const [activated, setActivated] = useState(false);
	const activate = useCallback(() => setActivated(true), []);

	return (
		<div>
			<Button onClick={activate}>Activate with Enter</Button>
			<output aria-live="polite">
				{activated ? "Activated" : "Not activated"}
			</output>
		</div>
	);
}

export const Default: Story = {
	args: { children: "Continue" },
};

export const Variants: Story = {
	render: () => (
		<div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
			<Button>Default</Button>
			<Button variant="destructive">Destructive</Button>
			<Button variant="ghost">Ghost</Button>
			<Button variant="link">Link</Button>
			<Button variant="outline">Outline</Button>
			<Button variant="secondary">Secondary</Button>
		</div>
	),
};

export const Sizes: Story = {
	render: () => (
		<div style={{ alignItems: "center", display: "flex", gap: 12 }}>
			<Button size="sm">Small</Button>
			<Button>Default</Button>
			<Button size="lg">Large</Button>
			<Button aria-label="Settings" size="icon">
				⚙
			</Button>
		</div>
	),
};

export const Disabled: Story = {
	args: { children: "Unavailable", disabled: true },
};

export const AsChild: Story = {
	render: () => (
		<Button asChild>
			<a href="/shared-ui-button">Open details</a>
		</Button>
	),
};

export const KeyboardInteraction: Story = {
	render: KeyboardActivationExample,
};

export const DisabledKeyboardInteraction: Story = {
	args: { children: "Cannot activate", disabled: true },
};
