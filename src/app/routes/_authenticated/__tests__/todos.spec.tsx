import type { QueryClient } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vite-plus/test";

import { Route as TodosRoute } from "@/app/routes/_authenticated/todos";
import { todosQueryOptions } from "@/pages/todos";
import { getRouteOption } from "@test/vitest/helpers/route";

vi.mock(import("@/pages/todos"));

describe("todos route options", () => {
  it("configures private no-store cache headers", () => {
    expect.assertions(1);

    // Arrange
    const headersFn = getRouteOption(TodosRoute, "headers") as () => Record<string, string>;

    // Act
    const headers = headersFn();

    // Assert
    expect(headers).toStrictEqual({ "Cache-Control": "private, no-store" });
  });

  it("pre-fetches todos data in loader", async () => {
    expect.assertions(1);

    // Arrange
    const loader = getRouteOption(TodosRoute, "loader") as (ctx: {
      context: { queryClient: QueryClient };
    }) => Promise<unknown>;
    const queryClient = {
      query: vi.fn<() => Promise<unknown>>(),
    } as unknown as QueryClient;

    // Act
    await loader({
      context: { queryClient },
    });

    // Assert
    expect(queryClient.query).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: todosQueryOptions().queryKey,
      }),
    );
  });

  it("renders TodosPage via Route component option", () => {
    expect.assertions(1);

    // Arrange
    const Component = getRouteOption(TodosRoute, "component") as React.ComponentType;

    // Act
    render(<Component />);

    // Assert
    expect(screen.getByRole("heading", { name: "Todos Page" })).toBeDefined();
  });
});
