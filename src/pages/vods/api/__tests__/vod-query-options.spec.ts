import { describe, expect, it, vi } from "vite-plus/test";

import { TEST_VOD } from "@test/vitest/fixtures/vods";

import { vodKeys, vodsQueryOptions } from "../vod-query-options";
import { getVodsFn } from "../vods.functions";

vi.mock(import("../vods.functions"));

describe("vod query options", () => {
  it("constructs expected hierarchical query keys", () => {
    expect.assertions(2);

    expect(vodKeys.all).toStrictEqual(["vods"]);
    expect(vodKeys.list()).toStrictEqual(["vods", "list"]);
  });

  it("builds vodsQueryOptions with list queryKey and delegates to getVodsFn", async () => {
    expect.assertions(3);

    // Arrange
    vi.mocked(getVodsFn).mockResolvedValueOnce([TEST_VOD]);
    const options = vodsQueryOptions();

    // Act
    const result = await options.queryFn?.({} as never);

    // Assert
    expect(options.queryKey).toStrictEqual(["vods", "list"]);
    expect(getVodsFn).toHaveBeenCalledOnce();
    expect(result).toStrictEqual([TEST_VOD]);
  });
});
