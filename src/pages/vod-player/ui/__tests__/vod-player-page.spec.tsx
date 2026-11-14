import { screen } from "@testing-library/react";
import { Suspense } from "react";
import { describe, expect, it, vi } from "vite-plus/test";

import { TEST_VOD_DETAIL } from "@test/vitest/fixtures/vods";
import { renderWithProviders } from "@test/vitest/wrappers/testing-wrapper";

import { getVodDetailFn } from "../../api/vod-player.functions";
import { VodPlayerPage } from "../vod-player-page";

vi.mock(import("../../api/vod-player.functions"));

describe("vod player page", () => {
  it("renders the VOD title loaded from vodDetailQueryOptions", async () => {
    expect.assertions(1);

    // Arrange
    vi.mocked(getVodDetailFn).mockResolvedValueOnce(TEST_VOD_DETAIL);

    // Act
    renderWithProviders(
      <Suspense fallback={<p>Loading VOD</p>}>
        <VodPlayerPage vodId={TEST_VOD_DETAIL.id} />
      </Suspense>,
    );
    const heading = await screen.findByRole("heading", { level: 1, name: TEST_VOD_DETAIL.title });

    // Assert
    expect(heading).toBeDefined();
  });
});
