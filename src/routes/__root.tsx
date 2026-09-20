import { TanStackDevtools } from "@tanstack/react-devtools";
import {
	createRootRoute,
	HeadContent,
	Link,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

// biome-ignore lint/correctness/noUnresolvedImports: Vite resolves this virtual CSS module.
import appCss from "../styles.css?url";

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
				title: "TanStack Start Starter",
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
});

function RootDocument({
	children,
}: {
	children: React.ReactNode;
}): React.JSX.Element {
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

function RootNotFound(): React.JSX.Element {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center p-8">
			<h1 className="font-bold text-2xl">404 - Page Not Found</h1>
			<p className="mt-2 text-gray-600">
				The page you were looking for does not exist.
			</p>
			<Link className="mt-4 text-blue-500 hover:underline" to="/">
				Go to Home
			</Link>
		</div>
	);
}
