import { QueryClient } from "@tanstack/react-query";
import { screen } from "@testing-library/react";
import { Suspense } from "react";
import { describe, expect, it, vi } from "vite-plus/test";

import type { VodCatalogueItem } from "@/pages/vods/api/vods-service";
import { TEST_VODS } from "@test/vitest/fixtures/vods";
import { renderWithProviders } from "@test/vitest/wrappers/testing-wrapper";

import { vodsQueryOptions } from "../../api/vod-query-options";
import { getVodsFn } from "../../api/vods.functions";
import { VodsPage } from "../vods-page";

vi.mock(import("../../api/vods.functions"));

function mountVodsPage(vods: VodCatalogueItem[]) {
  vi.mocked(getVodsFn).mockResolvedValueOnce(vods);
  renderWithProviders(
    <Suspense fallback={<p>Loading VODs</p>}>
      <VodsPage />
    </Suspense>,
  );
}

describe("vods page", () => {
  it("renders the VOD Catalogue heading and a card for each VOD", async () => {
    expect.assertions(3);

    // Arrange & Act
    mountVodsPage(TEST_VODS);
    const heading = await screen.findByRole("heading", { level: 1, name: "VOD Catalogue" });
    const items = screen.getAllByRole("listitem");
    const linkTitles = screen.getAllByRole("link").map((link) => link.textContent);

    // Assert
    expect(heading).toBeDefined();
    expect(items).toHaveLength(3);
    expect(linkTitles).toStrictEqual(TEST_VODS.map((vod) => vod.title));
  });

  it("renders an empty state card when no VODs are available", async () => {
    expect.assertions(3);

    // Arrange & Act
    mountVodsPage([]);
    const heading = await screen.findByRole("heading", { level: 1, name: "VOD Catalogue" });

    // Assert
    expect(heading).toBeDefined();
    expect(screen.getByText("No VODs available")).toBeDefined();
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("renders immediately from pre-seeded query cache without suspending", () => {
    expect.assertions(2);

    // Arrange
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const options = vodsQueryOptions();
    queryClient.setQueryDefaults(options.queryKey, { staleTime: Infinity });
    queryClient.setQueryData(options.queryKey, TEST_VODS);

    // Act
    renderWithProviders(<VodsPage />, { queryClient });

    // Assert
    expect(screen.getByRole("heading", { level: 1, name: "VOD Catalogue" })).toBeDefined();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });
});
