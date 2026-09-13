/**
 * Storybook visual component documentation and interaction stories for the AppLayout shell widget.
 *
 * Demonstrates full responsive desktop and mobile layouts with persistent navigation,
 * collapsed state interactions, and inner content presentation.
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { AppLayout } from "../app-layout";

function createMockRouter(initialPath = "/vods") {
	const rootRoute = createRootRoute({
		component: () => (
			<AppLayout>
				<div className="space-y-4">
					<h1 className="text-2xl font-bold">App Content Area</h1>
					<p className="text-muted-foreground">
						Demonstrating the integrated responsive layout shell with Navbar and
						Sidebar.
					</p>
				</div>
			</AppLayout>
		),
	});
	const history = createMemoryHistory({ initialEntries: [initialPath] });
	return createRouter({ history, routeTree: rootRoute });
}

const meta = {
	component: AppLayout,
	decorators: [
		() => {
			const router = createMockRouter();
			return <RouterProvider router={router} />;
		},
	],
	tags: ["autodocs"],
	title: "Widgets / AppLayout",
} satisfies Meta<typeof AppLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
