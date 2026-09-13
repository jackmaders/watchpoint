/**
 * Storybook visual component documentation and interaction stories for the Sidebar component.
 *
 * Demonstrates expanded navigation list, collapsed icon-only mode, and active route states
 * rendered within a TanStack memory router provider context.
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { Sidebar } from "../sidebar";

function createMockRouter(initialPath = "/vods") {
	const rootRoute = createRootRoute({
		component: () => <Sidebar />,
	});
	const history = createMemoryHistory({ initialEntries: [initialPath] });
	return createRouter({ history, routeTree: rootRoute });
}

const meta = {
	component: Sidebar,
	decorators: [
		() => {
			const router = createMockRouter();
			return (
				<div className="h-96 flex">
					<RouterProvider router={router} />
				</div>
			);
		},
	],
	tags: ["autodocs"],
	title: "Widgets / LayoutMain / Sidebar",
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Collapsed: Story = {
	render: () => {
		const rootRoute = createRootRoute({
			component: () => <Sidebar isCollapsed={true} />,
		});
		const history = createMemoryHistory({ initialEntries: ["/vods"] });
		const router = createRouter({ history, routeTree: rootRoute });
		return (
			<div className="h-96 flex">
				<RouterProvider router={router} />
			</div>
		);
	},
};
