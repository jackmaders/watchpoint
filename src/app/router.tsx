import {
	feedbackIntegration,
	init,
	replayIntegration,
	tanstackRouterBrowserTracingIntegration,
} from "@sentry/react";
import { QueryClient } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
	const queryClient = new QueryClient();
	const router = createTanStackRouter({
		routeTree,
		context: { queryClient },
		scrollRestoration: true,
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0,
	});
	if (!router.isServer) {
		init({
			dsn: "https://ad62fa82e1f47662f8ed69f2d6ef84f5@o4511871149670400.ingest.de.sentry.io/4511871151243344",
			sendDefaultPii: true,
			integrations: [
				tanstackRouterBrowserTracingIntegration(router),
				replayIntegration(),
				feedbackIntegration({
					colorScheme: "system",
				}),
			],
			enableLogs: true,
			tracesSampleRate: 1.0,
			replaysSessionSampleRate: 0.1,
			replaysOnErrorSampleRate: 1.0,
		});
	}
	setupRouterSsrQueryIntegration({ router, queryClient });

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
