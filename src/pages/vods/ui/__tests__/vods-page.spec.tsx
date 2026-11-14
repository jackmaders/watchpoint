import { QueryClient } from "@tanstack/react-query";
import { screen } from "@testing-library/react";
import { Suspense } from "react";
import { describe, expect, it, vi } from "vite-plus/test";

import { TEST_VODS } from "@test/vitest/fixtures/vods";
import { renderWithProviders } from "@test/vitest/wrappers/testing-wrapper";

import { vodsQueryOptions } from "../../api/vod-query-options";
import { getVodsFn } from "../../api/vods.functions";
import { VodsPage } from "../vods-page";

vi.mock(import("../../api/vods.functions"));

function renderSuspendedVodsPage() {
  renderWithProviders(
    <Suspense fallback={<p>Loading VODs</p>}>
      <VodsPage />
    </Suspense>,
  );
}

describe("vods page", () => {
  it("renders the VOD Catalogue heading and a card for each VOD", async () => {
    expect.assertions(3);

    // Arrange
    vi.mocked(getVodsFn).mockResolvedValueOnce(TEST_VODS);

    // Act
    renderSuspendedVodsPage();
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

    // Arrange
    vi.mocked(getVodsFn).mockResolvedValueOnce([]);

    // Act
    renderSuspendedVodsPage();
    const heading = await screen.findByRole("heading", { level: 1, name: "VOD Catalogue" });
    const emptyStateHeading = screen.getByText("No VODs available");
    const list = screen.queryByRole("list");

    // Assert
    expect(heading).toBeDefined();
    expect(emptyStateHeading).toBeDefined();
    expect(list).toBeNull();
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
    const heading = screen.getByRole("heading", { level: 1, name: "VOD Catalogue" });
    const items = screen.getAllByRole("listitem");

    // Assert
    expect(heading).toBeDefined();
    expect(items).toHaveLength(3);
  });
});
