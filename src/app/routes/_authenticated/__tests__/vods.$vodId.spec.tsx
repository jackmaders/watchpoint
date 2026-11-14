import type { QueryClient } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vite-plus/test";

import { Route as VodDetailRoute } from "@/app/routes/_authenticated/vods/$vodId";
import { vodDetailQueryOptions } from "@/pages/vod-player";
import { ApplicationError } from "@/shared/errors";
import { getRouteOption } from "@test/vitest/helpers/route";

vi.mock(import("@/pages/vod-player"));

type VodDetailLoader = (ctx: {
  context: { queryClient: QueryClient };
  params: { vodId: string };
}) => Promise<unknown>;

function getVodLoader(): VodDetailLoader {
  return getRouteOption(VodDetailRoute, "loader") as VodDetailLoader;
}

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
    const loader = getVodLoader();
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

  it("throws notFound when loader query rejects with VOD_NOT_FOUND", async () => {
    expect.assertions(1);

    // Arrange
    const loader = getVodLoader();
    const queryClient = {
      query: vi
        .fn<() => Promise<unknown>>()
        .mockRejectedValueOnce(new ApplicationError("VOD_NOT_FOUND")),
    } as unknown as QueryClient;

    // Act
    const result = loader({
      context: { queryClient },
      params: { vodId: "nonexistent-vod" },
    });

    // Assert
    await expect(result).rejects.toMatchObject({ isNotFound: true, throw: true });
  });

  it("rethrows non-VOD_NOT_FOUND ApplicationError from loader", async () => {
    expect.assertions(1);

    // Arrange
    const loader = getVodLoader();
    const error = new ApplicationError("INTERNAL_SERVER_ERROR");
    const queryClient = {
      query: vi.fn<() => Promise<unknown>>().mockRejectedValueOnce(error),
    } as unknown as QueryClient;

    // Act
    const result = loader({
      context: { queryClient },
      params: { vodId: "shu-ana-owcs-kr-s3" },
    });

    // Assert
    await expect(result).rejects.toBe(error);
  });

  it("rethrows generic Error from loader", async () => {
    expect.assertions(1);

    // Arrange
    const loader = getVodLoader();
    const error = new Error("Unexpected network failure");
    const queryClient = {
      query: vi.fn<() => Promise<unknown>>().mockRejectedValueOnce(error),
    } as unknown as QueryClient;

    // Act
    const result = loader({
      context: { queryClient },
      params: { vodId: "shu-ana-owcs-kr-s3" },
    });

    // Assert
    await expect(result).rejects.toBe(error);
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
