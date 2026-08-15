import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	createRootRoute,
	HeadContent,
	Link,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import appCss from "@/_app/styles/globals.css?url";

const queryClient = new QueryClient();

export const Route = createRootRoute({
	component: RootComponent,
	head: () => ({
		links: [
			{
				href: appCss,
				rel: "stylesheet",
			},
		],
		meta: [
			{
				charSet: "utf-8",
			},
			{
				content: "width=device-width, initial-scale=1",
				name: "viewport",
			},
			{
				title: "Watchpoint Interactive Engine",
			},
			{
				content: "Overwatch 2 interactive VOD decision training",
				name: "description",
			},
		],
	}),
	notFoundComponent: RootNotFoundComponent,
});

function RootComponent() {
	return (
		<RootDocument>
			<QueryClientProvider client={queryClient}>
				<Outlet />
			</QueryClientProvider>
		</RootDocument>
	);
}

function RootNotFoundComponent() {
	return (
		<RootDocument>
			<main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center p-8">
				<div className="max-w-md w-full text-center p-8 border border-slate-800 rounded-2xl bg-slate-900/60 shadow-xl space-y-4">
					<h1 className="text-3xl font-bold text-white">
						404 - Page Not Found
					</h1>
					<p className="text-slate-400 text-sm">
						The page you are looking for does not exist.
					</p>
					<Link
						className="inline-block mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors"
						to="/"
					>
						Return Home
					</Link>
				</div>
			</main>
		</RootDocument>
	);
}

function RootDocument({ children }: { children: ReactNode }) {
	return (
		<html className="h-full antialiased" lang="en">
			<head>
				<HeadContent />
			</head>
			<body className="min-h-full flex flex-col">
				{children}
				<Scripts />
			</body>
		</html>
	);
}
