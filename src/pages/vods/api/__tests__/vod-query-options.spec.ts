import { describe, expect, it, vi } from "vite-plus/test";

import { TEST_VOD } from "@test/vitest/fixtures/vods";

import { vodMapsQueryOptions, vodsQueryOptions } from "../vod-query-options";
import { getVodMapsFn, getVodsFn } from "../vods.functions";

vi.mock(import("../vods.functions"));

const SEARCH_PARAM_KEY = "q";

describe("vod query options", () => {
  it("configures normalized vods list queryKey and default empty filters", () => {
    expect.assertions(2);

    // Act
    const defaultOptions = vodsQueryOptions();
    const normalizedOptions = vodsQueryOptions({
      [SEARCH_PARAM_KEY]: "  Ana  ",
      role: "Support",
      sort: "Curated",
    });

    // Assert
    expect(defaultOptions.queryKey).toStrictEqual(["vods", "list", {}]);
    expect(normalizedOptions.queryKey).toStrictEqual([
      "vods",
      "list",
      { [SEARCH_PARAM_KEY]: "Ana", role: "Support" },
    ]);
  });

  it("delegates queryFn to getVodsFn with normalized filters", async () => {
    expect.assertions(2);

    // Arrange
    vi.mocked(getVodsFn).mockResolvedValueOnce([TEST_VOD]);
    const options = vodsQueryOptions({ [SEARCH_PARAM_KEY]: "  Ana  ", sort: "Map A–Z" });

    // Act
    const result = await options.queryFn?.({} as never);

    // Assert
    expect(getVodsFn).toHaveBeenCalledWith({
      data: { [SEARCH_PARAM_KEY]: "Ana", sort: "Map A–Z" },
    });
    expect(result).toStrictEqual([TEST_VOD]);
  });

  it("configures vodMapsQueryOptions and delegates queryFn to getVodMapsFn", async () => {
    expect.assertions(3);

    // Arrange
    const expectedMaps = ["King's Row", "Lijiang Tower", "Suravasa"];
    vi.mocked(getVodMapsFn).mockResolvedValueOnce(expectedMaps);
    const options = vodMapsQueryOptions();

    // Act
    const result = await options.queryFn?.({} as never);

    // Assert
    expect(options.queryKey).toStrictEqual(["vods", "maps"]);
    expect(getVodMapsFn).toHaveBeenCalledOnce();
    expect(result).toStrictEqual(expectedMaps);
  });
});
