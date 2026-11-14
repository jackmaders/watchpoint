import type { QueryClient } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vite-plus/test";

import { Route as VodsRoute } from "@/app/routes/_authenticated/vods";
import { vodsQueryOptions } from "@/pages/vods";
import { getRouteOption } from "@test/vitest/helpers/route";

vi.mock(import("@/pages/vods"));

describe("vods route options", () => {
  it("configures private no-store cache headers", () => {
    expect.assertions(1);

    // Arrange
    const headersFn = getRouteOption(VodsRoute, "headers") as () => Record<string, string>;

    // Act
    const headers = headersFn();

    // Assert
    expect(headers).toStrictEqual({ "Cache-Control": "private, no-store" });
  });

  it("pre-fetches vods data in loader", async () => {
    expect.assertions(1);

    // Arrange
    const loader = getRouteOption(VodsRoute, "loader") as (ctx: {
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
        queryKey: vodsQueryOptions().queryKey,
      }),
    );
  });

  it("renders VodsPage via Route component option", () => {
    expect.assertions(1);

    // Arrange
    const Component = getRouteOption(VodsRoute, "component") as React.ComponentType;

    // Act
    render(<Component />);

    // Assert
    expect(screen.getByRole("heading", { name: "VOD Catalogue Page" })).toBeDefined();
  });
});
