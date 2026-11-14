/* oxlint-disable eslint/id-length -- Test assertions verify the Ticket #12 URL search parameter "q". */
import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vite-plus/test";

import { Route as VodsRoute } from "@/app/routes/_authenticated/vods";
import { routeTree } from "@/app/routeTree.gen";
import { vodMapsQueryOptions, vodsQueryOptions } from "@/pages/vods";
import { getSessionFn } from "@/shared/auth";
import { TEST_SESSION } from "@test/vitest/fixtures/session";
import { TEST_VODS } from "@test/vitest/fixtures/vods";
import { getRouteOption } from "@test/vitest/helpers/route";

vi.mock(import("@/pages/vods"));
vi.mock(import("@/shared/auth"));
vi.mock(import("@/app/layouts"));
vi.mock(import("@/shared/ui/shadcn/toast"));

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

  it("validates URL search parameters via parseVodCatalogueSearch", () => {
    expect.assertions(2);

    // Arrange
    const validateSearch = getRouteOption(VodsRoute, "validateSearch") as (
      search: Record<string, unknown>,
    ) => unknown;

    // Act
    const validSearch = validateSearch({
      map: "  King's Row ",
      q: "  Ana ",
      role: "Support",
      sort: "Hero A–Z",
      tier: "OWCS",
    });
    const invalidSearch = validateSearch({ q: "   ", role: "Flex", sort: "Curated" });

    // Assert
    expect(validSearch).toStrictEqual({
      map: "King's Row",
      q: "Ana",
      role: "Support",
      sort: "Hero A–Z",
      tier: "OWCS",
    });
    expect(invalidSearch).toStrictEqual({});
  });

  it("forwards search params through loaderDeps and pre-fetches vods and maps in loader", async () => {
    expect.assertions(3);

    // Arrange
    const loaderDeps = getRouteOption(VodsRoute, "loaderDeps") as (ctx: {
      search: Record<string, unknown>;
    }) => Record<string, unknown>;
    const loader = getRouteOption(VodsRoute, "loader") as (ctx: {
      context: { queryClient: QueryClient };
      deps: Record<string, unknown>;
    }) => Promise<unknown>;
    const queryClient = {
      query: vi.fn<() => Promise<unknown>>().mockResolvedValue([]),
    } as unknown as QueryClient;
    const filters = { q: "Ana", role: "Support" } as const;

    // Act
    const deps = loaderDeps({ search: filters });
    await loader({
      context: { queryClient },
      deps,
    });

    // Assert
    expect(deps).toStrictEqual(filters);
    expect(queryClient.query).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: vodsQueryOptions(filters).queryKey,
      }),
    );
    expect(queryClient.query).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: vodMapsQueryOptions().queryKey,
      }),
    );
  });

  it("renders VodsPage with validated URL search params and updates URL on filter changes", async () => {
    expect.assertions(3);

    // Arrange
    vi.mocked(getSessionFn).mockResolvedValue(TEST_SESSION);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const initialOptions = vodsQueryOptions({ role: "Tank" });
    const nextOptions = vodsQueryOptions({ role: "Support" });
    const mapsOptions = vodMapsQueryOptions();
    queryClient.setQueryDefaults(initialOptions.queryKey, { staleTime: Infinity });
    queryClient.setQueryData(initialOptions.queryKey, TEST_VODS);
    queryClient.setQueryDefaults(nextOptions.queryKey, { staleTime: Infinity });
    queryClient.setQueryData(nextOptions.queryKey, TEST_VODS);
    queryClient.setQueryDefaults(mapsOptions.queryKey, { staleTime: Infinity });
    queryClient.setQueryData(mapsOptions.queryKey, ["King's Row"]);

    const router = createRouter({
      context: { queryClient, session: TEST_SESSION },
      history: createMemoryHistory({ initialEntries: ["/vods?role=Tank"] }),
      routeTree,
    });
    await router.load();
    const user = userEvent.setup();

    // Act
    render(<RouterProvider router={router} />);
    const heading = await screen.findByRole("heading", { name: "VOD Catalogue Page" });
    const initialFilters = screen.getByText('{"role":"Tank"}');
    await user.click(screen.getByRole("button", { name: "Apply Mock Filter" }));
    await waitFor(() => {
      expect({ ...router.state.location.search }).toStrictEqual({ role: "Support" });
    });

    // Assert
    expect(heading).toBeDefined();
    expect(initialFilters).toBeDefined();
  });

  it("updates controlFilters immediately while loader is pending and falls back when leaving /vods", async () => {
    expect.assertions(4);

    // Arrange
    vi.mocked(getSessionFn).mockResolvedValue(TEST_SESSION);
    let resolveNextVods: ((value: typeof TEST_VODS) => void) | undefined;
    const pendingVods = new Promise<typeof TEST_VODS>((resolve) => {
      resolveNextVods = resolve;
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const initialOptions = vodsQueryOptions({ role: "Tank" });
    const nextOptions = vodsQueryOptions({ role: "Support" });
    const mapsOptions = vodMapsQueryOptions();
    queryClient.setQueryDefaults(initialOptions.queryKey, { staleTime: Infinity });
    queryClient.setQueryData(initialOptions.queryKey, TEST_VODS);
    queryClient.setQueryDefaults(nextOptions.queryKey, { staleTime: Infinity });
    queryClient.setQueryData(nextOptions.queryKey, TEST_VODS);
    queryClient.setQueryDefaults(mapsOptions.queryKey, { staleTime: Infinity });
    queryClient.setQueryData(mapsOptions.queryKey, ["King's Row"]);

    const originalQuery = queryClient.query.bind(queryClient);
    const nextKey = JSON.stringify(nextOptions.queryKey);
    vi.spyOn(queryClient, "query").mockImplementation((async (
      options: Parameters<QueryClient["query"]>[0],
    ) => {
      if (JSON.stringify(options.queryKey) === nextKey) {
        return await pendingVods;
      }

      return await originalQuery(options);
    }) as QueryClient["query"]);

    const router = createRouter({
      context: { queryClient, session: TEST_SESSION },
      history: createMemoryHistory({ initialEntries: ["/vods?role=Tank"] }),
      routeTree,
    });
    await router.load();
    const user = userEvent.setup();

    // Act
    render(<RouterProvider router={router} />);
    await screen.findByRole("heading", { name: "VOD Catalogue Page" });
    await user.click(screen.getByRole("button", { name: "Apply Mock Filter" }));
    const pendingControls = await screen.findByText('controls:{"role":"Support"}');
    const committedBeforeResolve = screen.getByText('{"role":"Tank"}');
    resolveNextVods?.(TEST_VODS);
    const committedAfterResolve = await screen.findByText('{"role":"Support"}');
    await act(async () => {
      await router.navigate({ to: "/about" });
    });
    const aboutHeading = await screen.findByRole("heading", { name: "About" });

    // Assert
    expect(pendingControls).toBeDefined();
    expect(committedBeforeResolve).toBeDefined();
    expect(committedAfterResolve).toBeDefined();
    expect(aboutHeading).toBeDefined();
  });
});
