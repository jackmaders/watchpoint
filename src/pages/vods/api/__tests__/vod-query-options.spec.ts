import { describe, expect, it, vi } from "vite-plus/test";

import { TEST_VOD } from "@test/vitest/fixtures/vods";

import { vodsQueryOptions } from "../vod-query-options";
import { getVodsFn } from "../vods.functions";

vi.mock(import("../vods.functions"));

describe("vod query options", () => {
  it("configures the vods list queryKey", () => {
    expect.assertions(1);

    // Act
    const options = vodsQueryOptions();

    // Assert
    expect(options.queryKey).toStrictEqual(["vods", "list"]);
  });

  it("delegates queryFn to getVodsFn", async () => {
    expect.assertions(2);

    // Arrange
    vi.mocked(getVodsFn).mockResolvedValueOnce([TEST_VOD]);
    const options = vodsQueryOptions();

    // Act
    const result = await options.queryFn?.({} as never);

    // Assert
    expect(getVodsFn).toHaveBeenCalledOnce();
    expect(result).toStrictEqual([TEST_VOD]);
  });
});
