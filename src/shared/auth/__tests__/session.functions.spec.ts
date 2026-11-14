import { describe, expect, it, vi } from "vite-plus/test";

import { getSession } from "@/shared/auth/session.server";
import { TEST_SESSION } from "@test/vitest/fixtures/session";

vi.mock(import("@tanstack/react-start"));
vi.mock(import("@/shared/auth/session.server"));

describe("session.functions getSessionFn", () => {
  it("returns the session from getSession when authenticated", async () => {
    expect.assertions(1);

    // Arrange
    const { getSessionFn } = await import("@/shared/auth/session.functions");
    vi.mocked(getSession).mockResolvedValueOnce(TEST_SESSION);

    // Act
    const session = await getSessionFn();

    // Assert
    expect(session).toStrictEqual(TEST_SESSION);
  });

  it("returns null when getSession returns null", async () => {
    expect.assertions(1);

    // Arrange
    const { getSessionFn } = await import("@/shared/auth/session.functions");
    vi.mocked(getSession).mockResolvedValueOnce(null);

    // Act
    const session = await getSessionFn();

    // Assert
    expect(session).toBeNull();
  });
});
