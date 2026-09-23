import { QueryClient } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { routeTree } from "./routeTree.gen";

function createRouterInstance() {
	const queryClient = new QueryClient();
	const router = createTanStackRouter({
		routeTree,
		context: { queryClient },
		scrollRestoration: true,
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0,
	});
	setupRouterSsrQueryIntegration({ router, queryClient });

	return router;
}

let clientRouter: ReturnType<typeof createRouterInstance> | undefined;

export function getRouter() {
	if (typeof document !== "undefined" && clientRouter) {
		return clientRouter;
	}

	const router = createRouterInstance();

	if (typeof document !== "undefined") {
		clientRouter = router;
	}

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
