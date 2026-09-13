/**
 * Storybook visual component documentation and interaction stories for the Navbar component.
 *
 * Demonstrates default desktop navigation, nested route breadcrumbs, collapsed sidebar states,
 * and mobile drawer toggle activations wrapped inside a TanStack memory router provider.
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { Navbar } from "../navbar";

function createMockRouter(initialPath = "/") {
	const rootRoute = createRootRoute({
		component: () => <Navbar />,
	});
	const history = createMemoryHistory({ initialEntries: [initialPath] });
	return createRouter({ history, routeTree: rootRoute });
}

const meta = {
	component: Navbar,
	decorators: [
		() => {
			const router = createMockRouter();
			return <RouterProvider router={router} />;
		},
	],
	tags: ["autodocs"],
	title: "Widgets / LayoutMain / Navbar",
} satisfies Meta<typeof Navbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const MobileDrawerOpen: Story = {
	args: {
		isMobileSidebarOpen: true,
	},
};

export const DesktopSidebarCollapsed: Story = {
	args: {
		isDesktopSidebarCollapsed: true,
	},
};
