import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  RouterContextProvider,
  type AnyRouter,
} from "@tanstack/react-router";
import { render, type RenderOptions } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps, ReactElement } from "react";

interface TestingWrapperOptions {
  context?: Record<string, unknown>;
  initialLocation?: string;
  queryClient?: QueryClient;
  routePaths?: string[];
  router?: AnyRouter;
}

function createDefaultRouter({
  context,
  initialLocation = "/",
  queryClient,
  routePaths = ["/", "/about", "/todos", "/sign-in", "/sign-up", "/profile"],
}: {
  context?: Record<string, unknown> | undefined;
  initialLocation?: string | undefined;
  queryClient: QueryClient;
  routePaths?: string[] | undefined;
}) {
  const rootRoute = createRootRouteWithContext<Record<string, unknown>>()();
  const childRoutes = routePaths.map((path) =>
    createRoute({
      getParentRoute: () => rootRoute,
      path,
    }),
  );

  return createRouter({
    context: { queryClient, ...context },
    history: createMemoryHistory({ initialEntries: [initialLocation] }),
    routeTree: rootRoute.addChildren(childRoutes),
  });
}

function createTestingWrapper({
  context,
  initialLocation,
  queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  }),
  routePaths,
  router = createDefaultRouter({ context, initialLocation, queryClient, routePaths }),
}: TestingWrapperOptions = {}) {
  const routerContext = router.options.context as Record<string, unknown>;
  router.update({ context: { ...routerContext, ...context, queryClient } });

  function TestingWrapper(props: Omit<ComponentProps<typeof QueryClientProvider>, "client">) {
    return (
      <QueryClientProvider {...props} client={queryClient}>
        <RouterContextProvider router={router}>{props.children}</RouterContextProvider>
      </QueryClientProvider>
    );
  }

  return { queryClient, router, wrapper: TestingWrapper };
}

function renderWithProviders(
  ui: ReactElement,
  options?: TestingWrapperOptions & Omit<RenderOptions, "wrapper">,
) {
  const { context, initialLocation, queryClient, routePaths, router, ...renderOptions } =
    options ?? {};
  const testing = createTestingWrapper({
    ...(context !== undefined && { context }),
    ...(initialLocation !== undefined && { initialLocation }),
    ...(queryClient !== undefined && { queryClient }),
    ...(routePaths !== undefined && { routePaths }),
    ...(router !== undefined && { router }),
  });

  return {
    ...render(ui, { wrapper: testing.wrapper, ...renderOptions }),
    ...testing,
    user: userEvent.setup(),
  };
}

export { createTestingWrapper, renderWithProviders };
export type { TestingWrapperOptions };
