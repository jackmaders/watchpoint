import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vite-plus/test";

import { ProfilePage } from "@/pages/profile";
import { useAuth } from "@/shared/auth";
import { TEST_SESSION } from "@test/vitest/fixtures/session";

vi.mock(import("@/shared/auth"));

type AuthHookResult = ReturnType<typeof useAuth>;

describe("profile page component", () => {
  it("renders user information when session is loaded", () => {
    expect.assertions(4);

    // Arrange
    vi.mocked(useAuth).mockReturnValue({
      data: TEST_SESSION,
      error: null,
      isPending: false,
    } as unknown as AuthHookResult);

    // Act
    render(<ProfilePage />);

    // Assert
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("User Profile");
    expect(screen.getByText(/Name: Test User/u)).toBeDefined();
    expect(screen.getByText(/Email: test@example.com/u)).toBeDefined();
    expect(screen.getByText(/Role: user/u)).toBeDefined();
  });

  it("renders loading message when session details are not yet available", () => {
    expect.assertions(1);

    // Arrange
    vi.mocked(useAuth).mockReturnValue({
      data: null,
      error: null,
      isPending: true,
    } as unknown as AuthHookResult);

    // Act
    render(<ProfilePage />);

    // Assert
    expect(screen.getByText("Loading session details...")).toBeDefined();
  });
});
