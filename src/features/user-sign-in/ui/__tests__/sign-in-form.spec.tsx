import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { signIn } from "@/shared/auth";
import {
  TEST_AUTH_SERVER_ERROR,
  TEST_AUTH_SUCCESS,
  TEST_SIGN_IN_CREDENTIALS,
  TEST_SIGN_IN_ERROR,
} from "@test/vitest/fixtures/auth";
import { renderWithProviders } from "@test/vitest/wrappers/testing-wrapper";

import { SignInForm } from "../sign-in-form";

vi.mock(import("@/shared/auth"));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("sign in form", () => {
  it("renders sign in fields correctly", () => {
    expect.assertions(2);

    // Act
    renderWithProviders(<SignInForm />);

    // Assert
    expect(screen.getByLabelText("Email")).toBeDefined();
    expect(screen.getByLabelText("Password")).toBeDefined();
  });

  it("submits credentials with valid inputs", async () => {
    expect.hasAssertions();

    // Arrange
    vi.mocked(signIn.email).mockResolvedValue(TEST_AUTH_SUCCESS);
    const { user } = renderWithProviders(<SignInForm />);

    // Act
    await user.type(screen.getByLabelText("Email"), TEST_SIGN_IN_CREDENTIALS.email);
    await user.type(screen.getByLabelText("Password"), TEST_SIGN_IN_CREDENTIALS.password);
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    // Assert
    await waitFor(
      () => {
        expect(signIn.email).toHaveBeenCalledWith(TEST_SIGN_IN_CREDENTIALS);
      },
      { interval: 5 },
    );
  });

  it("displays form error message when sign in fails", async () => {
    expect.assertions(1);

    // Arrange
    vi.mocked(signIn.email).mockResolvedValue(TEST_SIGN_IN_ERROR);
    const { user } = renderWithProviders(<SignInForm />);

    // Act
    await user.type(screen.getByLabelText("Email"), TEST_SIGN_IN_CREDENTIALS.email);
    await user.type(screen.getByLabelText("Password"), TEST_SIGN_IN_CREDENTIALS.password);
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    // Assert
    await expect(screen.findByText(TEST_SIGN_IN_ERROR.error.message)).resolves.toBeDefined();
  });

  it("displays fallback error message when sign in fails without a message", async () => {
    expect.assertions(1);

    // Arrange
    vi.mocked(signIn.email).mockResolvedValue(TEST_AUTH_SERVER_ERROR);
    const { user } = renderWithProviders(<SignInForm />);

    // Act
    await user.type(screen.getByLabelText("Email"), TEST_SIGN_IN_CREDENTIALS.email);
    await user.type(screen.getByLabelText("Password"), TEST_SIGN_IN_CREDENTIALS.password);
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    // Assert
    await expect(screen.findByText("Failed to sign in")).resolves.toBeDefined();
  });
});
