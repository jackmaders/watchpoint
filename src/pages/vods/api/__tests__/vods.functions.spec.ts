import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { hasPermission } from "@/shared/auth/permissions";
import { ensureSession } from "@/shared/auth/session.server";
import { ApplicationError } from "@/shared/errors";
import { TEST_SESSION } from "@test/vitest/fixtures/session";
import { TEST_VOD } from "@test/vitest/fixtures/vods";

import { getVods } from "../vods-service";
import { getVodsFn } from "../vods.functions";

vi.mock(import("@tanstack/react-start"));
vi.mock(import("@/shared/auth/session.server"));
vi.mock(import("@/shared/auth/permissions"), { spy: true });
vi.mock(import("../vods-service"));

beforeEach(() => {
  vi.mocked(ensureSession).mockResolvedValue(TEST_SESSION);
});

describe("vods functions getVodsFn", () => {
  it("returns VOD catalogue items for authenticated users with vods:read permission", async () => {
    expect.assertions(3);

    // Arrange
    vi.mocked(getVods).mockResolvedValueOnce([TEST_VOD]);

    // Act
    const result = await getVodsFn();

    // Assert
    expect(hasPermission).toHaveBeenCalledWith("user", "vods:read");
    expect(getVods).toHaveBeenCalledOnce();
    expect(result).toStrictEqual([TEST_VOD]);
  });

  it("rejects with USER_UNAUTHENTICATED when ensureSession fails", async () => {
    expect.assertions(2);

    // Arrange
    vi.mocked(ensureSession).mockRejectedValueOnce(new ApplicationError("USER_UNAUTHENTICATED"));

    // Act
    const action = getVodsFn();

    // Assert
    await expect(action).rejects.toMatchObject({ code: "USER_UNAUTHENTICATED", statusCode: 401 });
    expect(getVods).not.toHaveBeenCalled();
  });

  it("rejects with USER_FORBIDDEN when permission is denied", async () => {
    expect.assertions(3);

    // Arrange
    vi.mocked(hasPermission).mockReturnValueOnce(false);

    // Act
    const action = getVodsFn();

    // Assert
    await expect(action).rejects.toThrow(ApplicationError);
    await expect(action).rejects.toMatchObject({ code: "USER_FORBIDDEN", statusCode: 403 });
    expect(getVods).not.toHaveBeenCalled();
  });
});
