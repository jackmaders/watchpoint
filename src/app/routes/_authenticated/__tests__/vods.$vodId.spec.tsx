import type { QueryClient } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vite-plus/test";

import { Route as VodDetailRoute } from "@/app/routes/_authenticated/vods/$vodId";
import { vodDetailQueryOptions } from "@/pages/vod-player";
import { getRouteOption } from "@test/vitest/helpers/route";

vi.mock(import("@/pages/vod-player"));

describe("vod detail route options", () => {
  it("configures private no-store cache headers", () => {
    expect.assertions(1);

    // Arrange
    const headersFn = getRouteOption(VodDetailRoute, "headers") as () => Record<string, string>;

    // Act
    const headers = headersFn();

    // Assert
    expect(headers).toStrictEqual({ "Cache-Control": "private, no-store" });
  });

  it("pre-fetches vod detail data in loader using route vodId param", async () => {
    expect.assertions(1);

    // Arrange
    const loader = getRouteOption(VodDetailRoute, "loader") as (ctx: {
      context: { queryClient: QueryClient };
      params: { vodId: string };
    }) => Promise<unknown>;
    const queryClient = {
      query: vi.fn<() => Promise<unknown>>(),
    } as unknown as QueryClient;

    // Act
    await loader({
      context: { queryClient },
      params: { vodId: "shu-ana-owcs-kr-s3" },
    });

    // Assert
    expect(queryClient.query).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: vodDetailQueryOptions("shu-ana-owcs-kr-s3").queryKey,
      }),
    );
  });

  it("renders VodPlayerPage with vodId from route params", () => {
    expect.assertions(1);

    // Arrange
    const Component = getRouteOption(VodDetailRoute, "component") as React.ComponentType;
    vi.spyOn(VodDetailRoute, "useParams").mockReturnValueOnce({
      vodId: "shu-ana-owcs-kr-s3",
    });

    // Act
    render(<Component />);

    // Assert
    expect(
      screen.getByRole("heading", { name: "VOD Player Page: shu-ana-owcs-kr-s3" }),
    ).toBeDefined();
  });
});
