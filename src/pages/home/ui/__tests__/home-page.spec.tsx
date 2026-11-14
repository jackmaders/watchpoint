import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vite-plus/test";

import { HomePage } from "../home-page";

vi.mock(import("@/shared/auth"));

describe("home page auth card", () => {
  it("renders the sign in form by default", () => {
    expect.assertions(3);

    // Arrange & Act
    render(<HomePage />);

    // Assert
    expect(screen.getByRole("heading", { name: "Sign In" })).toBeDefined();
    expect(screen.getByLabelText(/Email/u)).toBeDefined();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeDefined();
  });

  it("switches to the sign up form when the sign up tab is clicked", async () => {
    expect.assertions(3);

    // Arrange
    const user = userEvent.setup();
    render(<HomePage />);

    // Act
    await user.click(screen.getByRole("tab", { name: "Sign Up" }));

    // Assert
    expect(screen.getByRole("heading", { name: "Sign Up" })).toBeDefined();
    expect(screen.getByLabelText(/Name/u)).toBeDefined();
    expect(screen.getByRole("button", { name: "Create account" })).toBeDefined();
  });
});
