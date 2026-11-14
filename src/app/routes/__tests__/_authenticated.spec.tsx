import { QueryClient } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vite-plus/test";

import { Route as AuthenticatedRoute } from "@/app/routes/_authenticated";
import { TEST_SESSION } from "@test/vitest/fixtures/session";
import { getRouteOption } from "@test/vitest/helpers/route";

describe("_authenticated route beforeLoad guard", () => {
  it("returns session context when user is authenticated", () => {
    expect.assertions(1);

    // Arrange
    const beforeLoad = getRouteOption(AuthenticatedRoute, "beforeLoad") as (
      ctx: unknown,
    ) => unknown;
    const args = { context: { session: TEST_SESSION } };

    // Act
    const context = beforeLoad(args);

    // Assert
    expect(context).toStrictEqual({ session: TEST_SESSION });
  });

  it("throws a redirect to / when user is unauthenticated", () => {
    expect.assertions(1);

    // Arrange
    const beforeLoad = getRouteOption(AuthenticatedRoute, "beforeLoad") as (
      ctx: unknown,
    ) => unknown;
    const args = { context: { session: null } };

    // Assert
    expect(() => {
      beforeLoad(args);
    }).toThrow(
      expect.objectContaining({
        options: expect.objectContaining({ to: "/" }) as unknown,
      }),
    );
  });
});

describe("_authenticated route layout", () => {
  it("renders AuthenticatedLayout component with outlet", async () => {
    expect.assertions(1);

    // Arrange
    const Component = getRouteOption(AuthenticatedRoute, "component") as () => React.ReactNode;
    const rootRoute = createRootRouteWithContext<{ queryClient: QueryClient }>()({
      component: Component,
    });
    const childRoute = createRoute({
      component: () => <div>Outlet Content</div>,
      getParentRoute: () => rootRoute,
      path: "/",
    });
    const router = createRouter({
      context: { queryClient: new QueryClient() },
      history: createMemoryHistory({ initialEntries: ["/"] }),
      routeTree: rootRoute.addChildren([childRoute]),
    });
    await router.load();

    // Act
    render(<RouterProvider router={router} />);

    // Assert
    await expect(screen.findByText("Outlet Content")).resolves.toBeDefined();
  });
});
