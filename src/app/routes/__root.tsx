import { TanStackDevtools } from "@tanstack/react-devtools";
import { createRootRoute, Link, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { useEffect } from "react";

import appCss from "../styles.css?inline";

export const Route = createRootRoute({
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
				name: "description",
				content:
					"A focused workspace for keeping the things worth watching in sight.",
			},
			{
				title: "Watchpoint — keep the important signal in sight",
			},
		],
		links: [
			{
				rel: "icon",
				href: "/favicon.svg",
				type: "image/svg+xml",
			},
		],
	}),
	shellComponent: RootDocument,
	notFoundComponent: RootNotFound,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	useEffect(() => {
		document.documentElement.dataset.hydrated = "true";
	}, []);

	return (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta content="width=device-width, initial-scale=1" name="viewport" />
				<meta
					content="A focused workspace for keeping the things worth watching in sight."
					name="description"
				/>
				<title>Watchpoint — keep the important signal in sight</title>
				<link href="/favicon.svg" rel="icon" type="image/svg+xml" />
				<style>{appCss}</style>
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
