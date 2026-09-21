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

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;

export function getRouter() {
	const queryClient = new QueryClient();
	const router = createTanStackRouter({
		routeTree,
		context: { queryClient },
		scrollRestoration: true,
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0,
	});
	if (!router.isServer && sentryDsn) {
		init({
			dsn: sentryDsn,
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
