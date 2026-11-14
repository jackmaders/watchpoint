import {
  CancelledError,
  MutationCache,
  QueryCache,
  QueryClient,
  type Query,
} from "@tanstack/react-query";
import {
  createRouter as createTanStackRouter,
  isNotFound,
  isRedirect,
} from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

import { toast } from "@/shared/ui/shadcn/toast";

import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const queryClient = new QueryClient({
    mutationCache: new MutationCache({
      onError: (error) => {
        showServerErrorToast(error);
      },
    }),
    queryCache: new QueryCache({
      onError: (error, query) => {
        showServerErrorToast(error, { query });
      },
    }),
  });

  const router = createTanStackRouter({
    context: { queryClient, session: null },
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    routeTree,
    scrollRestoration: true,
  });

  setupRouterSsrQueryIntegration({
    queryClient,
    router,
  });

  return router;
}

function showServerErrorToast(error: Error, { query }: { query?: Query<unknown, unknown> } = {}) {
  if (
    typeof window === "undefined" ||
    query?.state.dataUpdatedAt === 0 ||
    error instanceof CancelledError ||
    isNotFound(error) ||
    isRedirect(error)
  ) {
    return;
  }

  toast.add({ title: error.message, type: "error" });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
