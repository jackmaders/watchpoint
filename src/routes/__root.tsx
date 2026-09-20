import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Link,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { useEffect } from "react";

// biome-ignore lint/correctness/noUnresolvedImports: Vite resolves this virtual CSS module.
import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
	{
		head: () => ({
			meta: [
				{
					charSet: "utf-8",
				},
				{
					name: "viewport",
					content: "width=device-width, initial-scale=1",
				},
				{
					title: "Watchpoint — keep the important signal in sight",
				},
			],
			links: [
				{
					rel: "stylesheet",
					href: appCss,
				},
			],
		}),
		shellComponent: RootDocument,
		notFoundComponent: RootNotFound,
	},
);

function RootDocument({ children }: { children: React.ReactNode }) {
	useEffect(() => {
		document.documentElement.dataset.hydrated = "true";
	}, []);

	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				{children}
				<TanStackDevtools
					config={{
						position: "bottom-right",
					}}
					plugins={[
						{
							name: "Tanstack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
					]}
				/>
				<Scripts />
			</body>
		</html>
	);
}

function RootNotFound() {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-background p-8 text-center">
			<p className="font-mono text-muted-foreground text-xs uppercase tracking-brand">
				Signal lost
			</p>
			<h1 className="mt-3 font-heading font-medium text-4xl tracking-tight">
				404 — Page not found
			</h1>
			<p className="mt-3 max-w-md text-muted-foreground">
				That route is outside the current watchpoint.
			</p>
			<Link
				className="mt-6 text-primary text-sm underline-offset-4 hover:underline"
				to="/"
			>
				Return to the signal desk
			</Link>
		</div>
	);
}
