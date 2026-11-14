import { afterAll, afterEach, describe, expect, it, vi } from "vite-plus/test";

import { signIn, signOut, signUp, useSession } from "@/shared/auth/auth.client";
import { toast } from "@/shared/ui/shadcn/toast";

const { fetchMock } = vi.hoisted(() => {
  const request = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", request);
  return { fetchMock: request };
});

vi.mock(import("@/shared/ui/shadcn/toast"));

afterEach(() => {
  vi.clearAllMocks();
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe("auth.client", () => {
  it("exports authentication methods", () => {
    expect.assertions(4);

    // Assert
    expect(signIn.email).toBeTypeOf("function");
    expect(signOut).toBeTypeOf("function");
    expect(signUp.email).toBeTypeOf("function");
    expect(useSession).toBeTypeOf("function");
  });

  it.each([
    {
      action: "sign in",
      submit: async (onSuccess: () => void) =>
        await signIn.email({ email: "test@example.com", password: "password123" }, { onSuccess }),
    },
    {
      action: "sign up",
      submit: async (onSuccess: () => void) =>
        await signUp.email(
          { email: "test@example.com", name: "Test User", password: "password123" },
          { onSuccess },
        ),
    },
    {
      action: "sign out",
      submit: async (onSuccess: () => void) => await signOut({ fetchOptions: { onSuccess } }),
    },
  ])("toasts a failed $action request once", async ({ submit }) => {
    expect.assertions(2);

    // Arrange
    fetchMock.mockResolvedValue(
      Response.json(
        { message: "Authentication denied" },
        {
          status: 401,
        },
      ),
    );
    const onSuccess = vi.fn<() => void>();

    // Act
    await submit(onSuccess);

    // Assert
    expect(toast.add).toHaveBeenCalledExactlyOnceWith({
      title: "Authentication denied",
      type: "error",
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it.each(["", null])("uses a fallback for an unusable error message (%s)", async (message) => {
    expect.assertions(1);

    // Arrange
    fetchMock.mockResolvedValue(
      Response.json(
        { message },
        {
          status: 400,
        },
      ),
    );

    // Act
    await signIn.email({ email: "test@example.com", password: "password123" });

    // Assert
    expect(toast.add).toHaveBeenCalledExactlyOnceWith({
      title: "Authentication failed",
      type: "error",
    });
  });

  it("keeps success callbacks and does not toast successful requests", async () => {
    expect.assertions(2);

    // Arrange
    fetchMock.mockResolvedValue(Response.json({ token: "session-token" }));
    const onSuccess = vi.fn<() => void>();

    // Act
    await signIn.email({ email: "test@example.com", password: "password123" }, { onSuccess });

    // Assert
    expect(onSuccess).toHaveBeenCalledOnce();
    expect(toast.add).not.toHaveBeenCalled();
  });
});
