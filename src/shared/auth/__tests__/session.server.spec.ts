import { getRequestHeaders } from "@tanstack/react-start/server";
import { describe, expect, it, vi } from "vite-plus/test";

import { auth } from "@/shared/auth/auth.server";
import { ensureSession, getSession } from "@/shared/auth/session.server";
import { TEST_SESSION } from "@test/vitest/fixtures/session";

vi.mock(import("@tanstack/react-start/server"));

describe("session.server getSession", () => {
  it("extracts request headers and fetches the session from auth api", async () => {
    expect.assertions(2);

    // Arrange
    const headers = new Headers({ cookie: "better-auth.session_token=valid-token" });
    vi.mocked(getRequestHeaders).mockReturnValueOnce(headers);
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(TEST_SESSION);

    // Act
    const session = await getSession();

    // Assert
    expect(session).toStrictEqual(TEST_SESSION);
    expect(auth.api.getSession).toHaveBeenCalledWith({ headers });
  });

  it("returns null when no authenticated session is found", async () => {
    expect.assertions(1);

    // Arrange
    vi.mocked(getRequestHeaders).mockReturnValueOnce(new Headers());
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);

    // Act
    const session = await getSession();

    // Assert
    expect(session).toBeNull();
  });
});

describe("session.server ensureSession", () => {
  it("returns the session when an authenticated user is present", async () => {
    expect.assertions(1);

    // Arrange
    vi.mocked(getRequestHeaders).mockReturnValueOnce(new Headers());
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(TEST_SESSION);

    // Act
    const session = await ensureSession();

    // Assert
    expect(session).toStrictEqual(TEST_SESSION);
  });

  it("throws Unauthorized error when no session is present", async () => {
    expect.assertions(1);

    // Arrange
    vi.mocked(getRequestHeaders).mockReturnValueOnce(new Headers());
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);

    // Act & Assert
    await expect(ensureSession()).rejects.toThrow("Unauthorized");
  });
});
