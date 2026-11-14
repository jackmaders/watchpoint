import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { hasPermission } from "@/shared/auth/permissions";
import { ensureSession } from "@/shared/auth/session.server";
import { ApplicationError } from "@/shared/errors";
import { TEST_SESSION } from "@test/vitest/fixtures/session";
import { TEST_VOD_DETAIL } from "@test/vitest/fixtures/vods";

import { getVodDetail } from "../vod-detail-service";
import { getVodDetailFn } from "../vod-player.functions";

vi.mock(import("@tanstack/react-start"));
vi.mock(import("@/shared/auth/session.server"));
vi.mock(import("@/shared/auth/permissions"), { spy: true });
vi.mock(import("../vod-detail-service"));

beforeEach(() => {
  vi.mocked(ensureSession).mockResolvedValue(TEST_SESSION);
});

describe("vod-player functions getVodDetailFn", () => {
  it("returns VOD detail for authenticated users with vods:read permission and trims vodId", async () => {
    expect.assertions(3);

    // Arrange
    vi.mocked(getVodDetail).mockResolvedValueOnce(TEST_VOD_DETAIL);

    // Act
    const result = await getVodDetailFn({ data: { vodId: `  ${TEST_VOD_DETAIL.id}  ` } });

    // Assert
    expect(hasPermission).toHaveBeenCalledWith("user", "vods:read");
    expect(getVodDetail).toHaveBeenCalledWith({ vodId: TEST_VOD_DETAIL.id });
    expect(result).toStrictEqual(TEST_VOD_DETAIL);
  });

  it("rejects empty vodId input via validation schema before calling getVodDetail", async () => {
    expect.assertions(2);

    // Act
    const action = getVodDetailFn({ data: { vodId: "   " } });

    // Assert
    await expect(action).rejects.toThrow("VOD id is required");
    expect(getVodDetail).not.toHaveBeenCalled();
  });

  it("rejects with USER_UNAUTHENTICATED when ensureSession fails", async () => {
    expect.assertions(2);

    // Arrange
    vi.mocked(ensureSession).mockRejectedValueOnce(new ApplicationError("USER_UNAUTHENTICATED"));

    // Act
    const action = getVodDetailFn({ data: { vodId: TEST_VOD_DETAIL.id } });

    // Assert
    await expect(action).rejects.toMatchObject({ code: "USER_UNAUTHENTICATED", statusCode: 401 });
    expect(getVodDetail).not.toHaveBeenCalled();
  });

  it("rejects with USER_FORBIDDEN when permission is denied", async () => {
    expect.assertions(3);

    // Arrange
    vi.mocked(hasPermission).mockReturnValueOnce(false);

    // Act
    const action = getVodDetailFn({ data: { vodId: TEST_VOD_DETAIL.id } });

    // Assert
    await expect(action).rejects.toThrow(ApplicationError);
    await expect(action).rejects.toMatchObject({ code: "USER_FORBIDDEN", statusCode: 403 });
    expect(getVodDetail).not.toHaveBeenCalled();
  });

  it("propagates ApplicationError VOD_NOT_FOUND from getVodDetail", async () => {
    expect.assertions(1);

    // Arrange
    vi.mocked(getVodDetail).mockRejectedValueOnce(new ApplicationError("VOD_NOT_FOUND"));

    // Act
    const action = getVodDetailFn({ data: { vodId: "missing-vod" } });

    // Assert
    await expect(action).rejects.toMatchObject({ code: "VOD_NOT_FOUND", statusCode: 404 });
  });
});
