/* oxlint-disable eslint/id-length -- Test assertions verify the Ticket #12 URL search parameter "q". */
import { QueryClient } from "@tanstack/react-query";
import { screen } from "@testing-library/react";
import { Suspense } from "react";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { TEST_VODS } from "@test/vitest/fixtures/vods";
import { renderWithProviders } from "@test/vitest/wrappers/testing-wrapper";

import { vodMapsQueryOptions, vodsQueryOptions } from "../../api/vod-query-options";
import { getVodMapsFn, getVodsFn } from "../../api/vods.functions";
import type { VodCatalogueFilters } from "../../model/vod-catalogue";
import { VodsPage } from "../vods-page";

vi.mock(import("../../api/vods.functions"));

const TEST_MAPS = ["King's Row", "Lijiang Tower", "Suravasa"];

function renderSuspendedVodsPage({
  filters = {},
  onFiltersChange = vi.fn<(nextFilters: VodCatalogueFilters) => void>(),
}: {
  filters?: VodCatalogueFilters;
  onFiltersChange?: (nextFilters: VodCatalogueFilters) => void;
} = {}) {
  const view = renderWithProviders(
    <Suspense fallback={<p>Loading VODs</p>}>
      <VodsPage filters={filters} onFiltersChange={onFiltersChange} />
    </Suspense>,
  );

  return { ...view, onFiltersChange };
}

function createPreSeededQueryClient(filters: VodCatalogueFilters = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const listOptions = vodsQueryOptions(filters);
  const mapsOptions = vodMapsQueryOptions();
  queryClient.setQueryDefaults(listOptions.queryKey, { staleTime: Infinity });
  queryClient.setQueryData(listOptions.queryKey, TEST_VODS);
  queryClient.setQueryDefaults(mapsOptions.queryKey, { staleTime: Infinity });
  queryClient.setQueryData(mapsOptions.queryKey, TEST_MAPS);
  return queryClient;
}

describe("vods page", () => {
  beforeEach(() => {
    vi.mocked(getVodMapsFn).mockResolvedValue(TEST_MAPS);
  });

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

  it("renders search, role, competitive tier, map, and sort controls", async () => {
    expect.assertions(5);

    // Arrange
    vi.mocked(getVodsFn).mockResolvedValueOnce(TEST_VODS);

    // Act
    renderSuspendedVodsPage();
    const searchInput = await screen.findByRole("searchbox", { name: "Search" });
    const roleSelect = screen.getByRole("combobox", { name: "Role" });
    const tierSelect = screen.getByRole("combobox", { name: "Competitive Tier" });
    const mapSelect = screen.getByRole("combobox", { name: "Map" });
    const sortSelect = screen.getByRole("combobox", { name: "Sort" });

    // Assert
    expect(searchInput).toBeDefined();
    expect(roleSelect).toBeDefined();
    expect(tierSelect).toBeDefined();
    expect(mapSelect).toBeDefined();
    expect(sortSelect).toBeDefined();
  });

  it("renders an un-filtered empty state card when no VODs are available", async () => {
    expect.assertions(4);

    // Arrange
    vi.mocked(getVodsFn).mockResolvedValueOnce([]);

    // Act
    renderSuspendedVodsPage();
    const heading = await screen.findByRole("heading", { level: 1, name: "VOD Catalogue" });
    const emptyStateHeading = screen.getByText("No VODs available");
    const clearButton = screen.queryByRole("button", { name: "Clear filters" });
    const list = screen.queryByRole("list");

    // Assert
    expect(heading).toBeDefined();
    expect(emptyStateHeading).toBeDefined();
    expect(clearButton).toBeNull();
    expect(list).toBeNull();
  });

  it("renders a filtered empty state and resets filters when Clear filters is clicked", async () => {
    expect.assertions(4);

    // Arrange
    vi.mocked(getVodsFn).mockResolvedValueOnce([]);
    const onFiltersChange = vi.fn<(nextFilters: VodCatalogueFilters) => void>();

    // Act
    const { user } = renderSuspendedVodsPage({
      filters: { q: "Nonexistent", role: "Support" },
      onFiltersChange,
    });
    const emptyHeading = await screen.findByText("No matching VODs");
    const clearButton = screen.getByRole("button", { name: "Clear filters" });
    const list = screen.queryByRole("list");
    await user.click(clearButton);

    // Assert
    expect(emptyHeading).toBeDefined();
    expect(clearButton).toBeDefined();
    expect(list).toBeNull();
    expect(onFiltersChange).toHaveBeenCalledWith({});
  });

  it("submits search query and normalizes blank search text while preserving other filters", async () => {
    expect.assertions(2);

    // Arrange
    vi.mocked(getVodsFn).mockResolvedValue(TEST_VODS);
    const onFiltersChange = vi.fn<(nextFilters: VodCatalogueFilters) => void>();

    // Act
    const { user } = renderSuspendedVodsPage({
      filters: { role: "Support" },
      onFiltersChange,
    });
    const searchInput = await screen.findByRole("searchbox", { name: "Search" });
    const searchButton = screen.getByRole("button", { name: "Search" });
    await user.type(searchInput, "  Ana  ");
    await user.click(searchButton);
    await user.clear(searchInput);
    await user.click(searchButton);

    // Assert
    expect(onFiltersChange).toHaveBeenNthCalledWith(1, { q: "Ana", role: "Support" });
    expect(onFiltersChange).toHaveBeenNthCalledWith(2, { role: "Support" });
  });

  it("updates role, competitive tier, map, and sort filters on selection", async () => {
    expect.assertions(5);

    // Arrange
    vi.mocked(getVodsFn).mockResolvedValue(TEST_VODS);
    const onFiltersChange = vi.fn<(nextFilters: VodCatalogueFilters) => void>();

    // Act
    const { user } = renderSuspendedVodsPage({
      filters: { q: "Ana", role: "Support", sort: "Map A–Z" },
      onFiltersChange,
    });
    const roleSelect = await screen.findByRole("combobox", { name: "Role" });
    const tierSelect = screen.getByRole("combobox", { name: "Competitive Tier" });
    const mapSelect = screen.getByRole("combobox", { name: "Map" });
    const sortSelect = screen.getByRole("combobox", { name: "Sort" });

    await user.selectOptions(roleSelect, "Tank");
    await user.selectOptions(tierSelect, "OWCS");
    await user.selectOptions(mapSelect, "King's Row");
    await user.selectOptions(sortSelect, "Most Checkpoints");
    await user.selectOptions(sortSelect, "Curated");

    // Assert
    expect(onFiltersChange).toHaveBeenNthCalledWith(1, {
      q: "Ana",
      role: "Tank",
      sort: "Map A–Z",
    });
    expect(onFiltersChange).toHaveBeenNthCalledWith(2, {
      q: "Ana",
      role: "Support",
      sort: "Map A–Z",
      tier: "OWCS",
    });
    expect(onFiltersChange).toHaveBeenNthCalledWith(3, {
      map: "King's Row",
      q: "Ana",
      role: "Support",
      sort: "Map A–Z",
    });
    expect(onFiltersChange).toHaveBeenNthCalledWith(4, {
      q: "Ana",
      role: "Support",
      sort: "Most Checkpoints",
    });
    expect(onFiltersChange).toHaveBeenNthCalledWith(5, {
      q: "Ana",
      role: "Support",
    });
  });

  it("syncs control values when filters prop changes externally", () => {
    expect.assertions(4);

    // Arrange
    const initialFilters: VodCatalogueFilters = {
      map: "King's Row",
      q: "Ana",
      role: "Support",
      tier: "OWCS",
    };
    const queryClient = createPreSeededQueryClient(initialFilters);
    const nextListOptions = vodsQueryOptions({ role: "Tank" });
    queryClient.setQueryDefaults(nextListOptions.queryKey, { staleTime: Infinity });
    queryClient.setQueryData(nextListOptions.queryKey, TEST_VODS);
    const onFiltersChange = vi.fn<(nextFilters: VodCatalogueFilters) => void>();

    // Act
    const { rerender } = renderWithProviders(
      <VodsPage filters={initialFilters} onFiltersChange={onFiltersChange} />,
      { queryClient },
    );
    const searchInput = screen.getByRole<HTMLInputElement>("searchbox", { name: "Search" });
    const roleSelect = screen.getByRole("combobox", { name: "Role" });
    const initialQueryValue = searchInput.value;
    const initialRoleValue = (roleSelect as unknown as { value: string }).value;

    rerender(<VodsPage filters={{ role: "Tank" }} onFiltersChange={onFiltersChange} />);
    const updatedQueryValue = searchInput.value;
    const updatedRoleValue = (roleSelect as unknown as { value: string }).value;

    // Assert
    expect(initialQueryValue).toBe("Ana");
    expect(initialRoleValue).toBe("Support");
    expect(updatedQueryValue).toBe("");
    expect(updatedRoleValue).toBe("Tank");
  });

  it("renders immediately from pre-seeded query cache without suspending", () => {
    expect.assertions(2);

    // Arrange
    const queryClient = createPreSeededQueryClient();
    const onFiltersChange = vi.fn<(nextFilters: VodCatalogueFilters) => void>();

    // Act
    renderWithProviders(<VodsPage filters={{}} onFiltersChange={onFiltersChange} />, {
      queryClient,
    });
    const heading = screen.getByRole("heading", { level: 1, name: "VOD Catalogue" });
    const items = screen.getAllByRole("listitem");

    // Assert
    expect(heading).toBeDefined();
    expect(items).toHaveLength(3);
  });

  it("uses controlFilters for filter controls while querying with committed filters", async () => {
    expect.assertions(3);

    // Arrange
    const queryClient = createPreSeededQueryClient({ tier: "OWCS" });
    const onFiltersChange = vi.fn<(nextFilters: VodCatalogueFilters) => void>();

    // Act
    const { user } = renderWithProviders(
      <VodsPage
        controlFilters={{ tier: "OWCS", role: "Tank" }}
        filters={{ tier: "OWCS" }}
        onFiltersChange={onFiltersChange}
      />,
      { queryClient },
    );
    const roleSelect = screen.getByRole("combobox", { name: "Role" });
    const tierSelect = screen.getByRole("combobox", {
      name: "Competitive Tier",
    });
    const mapSelect = screen.getByRole("combobox", { name: "Map" });
    await user.selectOptions(mapSelect, "Lijiang Tower");

    // Assert
    expect(roleSelect).toHaveProperty("value", "Tank");
    expect(tierSelect).toHaveProperty("value", "OWCS");
    expect(onFiltersChange).toHaveBeenCalledWith({
      map: "Lijiang Tower",
      role: "Tank",
      tier: "OWCS",
    });
  });
});
