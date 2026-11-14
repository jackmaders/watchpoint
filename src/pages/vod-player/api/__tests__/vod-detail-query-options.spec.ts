import { describe, expect, it, vi } from "vite-plus/test";

import { TEST_VOD_DETAIL } from "@test/vitest/fixtures/vods";

import { vodDetailQueryOptions } from "../vod-detail-query-options";
import { getVodDetailFn } from "../vod-player.functions";

vi.mock(import("../vod-player.functions"));

describe("vod detail query options", () => {
  it("configures the vod detail queryKey scoped by vodId", () => {
    expect.assertions(1);

    // Act
    const options = vodDetailQueryOptions(TEST_VOD_DETAIL.id);

    // Assert
    expect(options.queryKey).toStrictEqual(["vods", "detail", TEST_VOD_DETAIL.id]);
  });

  it("delegates queryFn to getVodDetailFn with vodId", async () => {
    expect.assertions(2);

    // Arrange
    vi.mocked(getVodDetailFn).mockResolvedValueOnce(TEST_VOD_DETAIL);
    const options = vodDetailQueryOptions(TEST_VOD_DETAIL.id);

    // Act
    const result = await options.queryFn?.({} as never);

    // Assert
    expect(getVodDetailFn).toHaveBeenCalledWith({ data: { vodId: TEST_VOD_DETAIL.id } });
    expect(result).toStrictEqual(TEST_VOD_DETAIL);
  });
});
