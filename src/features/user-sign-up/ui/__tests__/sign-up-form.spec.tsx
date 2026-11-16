import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { signUp } from "@/shared/auth";
import {
  TEST_AUTH_SERVER_ERROR,
  TEST_AUTH_SUCCESS,
  TEST_SIGN_UP_CREDENTIALS,
  TEST_SIGN_UP_ERROR,
} from "@test/vitest/fixtures/auth";
import { renderWithProviders } from "@test/vitest/wrappers/testing-wrapper";

import { SignUpForm } from "../sign-up-form";

vi.mock(import("@/shared/auth"));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("sign up form", () => {
  it("renders form fields and labels correctly", () => {
    expect.assertions(4);

    // Act
    renderWithProviders(<SignUpForm />);

    // Assert
    expect(screen.getByLabelText("Name")).toBeDefined();
    expect(screen.getByLabelText("Email")).toBeDefined();
    expect(screen.getByLabelText("Password")).toBeDefined();
    expect(screen.getByText("Use at least 8 characters.")).toBeDefined();
  });

  it("rejects passwords shorter than eight characters", async () => {
    expect.assertions(2);

    // Arrange
    const { user } = renderWithProviders(<SignUpForm />);

    // Act
    await user.type(screen.getByLabelText("Name"), TEST_SIGN_UP_CREDENTIALS.name);
    await user.type(screen.getByLabelText("Email"), TEST_SIGN_UP_CREDENTIALS.email);
    await user.type(screen.getByLabelText("Password"), "short");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    // Assert
    await expect(
      screen.findByText("Password must be at least 8 characters"),
    ).resolves.toBeDefined();
    expect(signUp.email).not.toHaveBeenCalled();
  });

  it("submits registration with valid inputs", async () => {
    expect.hasAssertions();

    // Arrange
    vi.mocked(signUp.email).mockResolvedValue(TEST_AUTH_SUCCESS);
    const { user } = renderWithProviders(<SignUpForm />);

    // Act
    await user.type(screen.getByLabelText("Name"), TEST_SIGN_UP_CREDENTIALS.name);
    await user.type(screen.getByLabelText("Email"), TEST_SIGN_UP_CREDENTIALS.email);
    await user.type(screen.getByLabelText("Password"), TEST_SIGN_UP_CREDENTIALS.password);
    await user.click(screen.getByRole("button", { name: "Create account" }));

    // Assert
    await waitFor(() => {
      expect(signUp.email).toHaveBeenCalledWith(TEST_SIGN_UP_CREDENTIALS);
    });
  });

  it("displays form error message when sign up fails", async () => {
    expect.assertions(1);

    // Arrange
    vi.mocked(signUp.email).mockResolvedValue(TEST_SIGN_UP_ERROR);
    const { user } = renderWithProviders(<SignUpForm />);

    // Act
    await user.type(screen.getByLabelText("Name"), TEST_SIGN_UP_CREDENTIALS.name);
    await user.type(screen.getByLabelText("Email"), TEST_SIGN_UP_CREDENTIALS.email);
    await user.type(screen.getByLabelText("Password"), TEST_SIGN_UP_CREDENTIALS.password);
    await user.click(screen.getByRole("button", { name: "Create account" }));

    // Assert
    await expect(screen.findByText(TEST_SIGN_UP_ERROR.error.message)).resolves.toBeDefined();
  });

  it("displays fallback error message when sign up fails without a message", async () => {
    expect.assertions(1);

    // Arrange
    vi.mocked(signUp.email).mockResolvedValue(TEST_AUTH_SERVER_ERROR);
    const { user } = renderWithProviders(<SignUpForm />);

    // Act
    await user.type(screen.getByLabelText("Name"), TEST_SIGN_UP_CREDENTIALS.name);
    await user.type(screen.getByLabelText("Email"), TEST_SIGN_UP_CREDENTIALS.email);
    await user.type(screen.getByLabelText("Password"), TEST_SIGN_UP_CREDENTIALS.password);
    await user.click(screen.getByRole("button", { name: "Create account" }));

    // Assert
    await expect(screen.findByText("Failed to sign up")).resolves.toBeDefined();
  });
});
