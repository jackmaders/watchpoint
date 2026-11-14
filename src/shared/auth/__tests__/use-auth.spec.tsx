import { createRootRoute, createRouter } from "@tanstack/react-router";
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vite-plus/test";

import { ApplicationError } from "@/shared/errors";
import { createTestingWrapper } from "@test/vitest/wrappers/testing-wrapper";

import { authClient, useSession } from "../auth.client";
import { useAuth } from "../use-auth";

vi.mock(import("../auth.client"));

describe("use-auth hook", () => {
  it("provides session state, action methods, and handles signOut", async () => {
    expect.assertions(3);

    const mockSession = {
      data: { user: { id: "test-user-id" } },
      error: null,
      isPending: false,
      refetch: vi.fn<() => Promise<unknown>>(),
    };
    vi.mocked(useSession).mockReturnValue(mockSession as never);

    const expectedResult = { success: true };
    vi.mocked(authClient.signOut).mockResolvedValueOnce(expectedResult);

    const router = createRouter({ routeTree: createRootRoute() });
    const invalidateSpy = vi.spyOn(router, "invalidate");
    const { wrapper } = createTestingWrapper({ router });
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current).toMatchObject({
      data: mockSession.data,
      error: null,
      isPending: false,
      signInEmail: expect.any(Function) as unknown,
      signOut: expect.any(Function) as unknown,
      signUpEmail: expect.any(Function) as unknown,
    });

    await result.current.signOut();
    expect(authClient.signOut).toHaveBeenCalledOnce();
    expect(invalidateSpy).toHaveBeenCalledOnce();
  });

  it("handles signInEmail and signUpEmail calls", async () => {
    expect.assertions(5);

    const signRes = { data: { user: { id: "user-1" } }, error: null };
    const upRes = { data: { user: { id: "user-2" } }, error: null };
    vi.mocked(authClient.signIn.email).mockResolvedValueOnce(signRes);
    vi.mocked(authClient.signUp.email).mockResolvedValueOnce(upRes);

    const router = createRouter({ routeTree: createRootRoute() });
    const invalidateSpy = vi.spyOn(router, "invalidate");
    const { wrapper } = createTestingWrapper({ router });
    const { result } = renderHook(() => useAuth(), { wrapper });

    const creds = { email: "test@example.com", password: "password123" };
    const r1 = await result.current.signInEmail(creds);
    expect(authClient.signIn.email).toHaveBeenCalledWith(creds);
    expect(r1).toBe(signRes);

    const payload = { email: "new@example.com", name: "New User", password: "password123" };
    const r2 = await result.current.signUpEmail(payload);
    expect(authClient.signUp.email).toHaveBeenCalledWith(payload);
    expect(r2).toBe(upRes);
    expect(invalidateSpy).toHaveBeenCalledTimes(2);
  });

  it("throws ApplicationError when signInEmail or signUpEmail returns an error", async () => {
    expect.assertions(5);

    const router = createRouter({ routeTree: createRootRoute() });
    const invalidateSpy = vi.spyOn(router, "invalidate");
    const { wrapper } = createTestingWrapper({ router });
    const { result } = renderHook(() => useAuth(), { wrapper });

    vi.mocked(authClient.signIn.email)
      .mockResolvedValueOnce({
        data: null,
        error: { message: "Invalid email or password", status: 401, statusText: "Unauthorized" },
      })
      .mockResolvedValueOnce({
        data: null,
        error: { message: "", status: 500, statusText: "Internal Server Error" },
      });

    vi.mocked(authClient.signUp.email)
      .mockResolvedValueOnce({
        data: null,
        error: { message: "Email already in use", status: 400, statusText: "Bad Request" },
      })
      .mockResolvedValueOnce({
        data: null,
        error: { status: 500, statusText: "Internal Server Error" },
      });

    const creds = { email: "test@example.com", password: "password123" };
    await expect(result.current.signInEmail(creds)).rejects.toThrow(
      new ApplicationError("USER_UNAUTHENTICATED", { message: "Invalid email or password" }),
    );
    await expect(result.current.signInEmail(creds)).rejects.toThrow(
      new ApplicationError("USER_UNAUTHENTICATED", { message: "Failed to sign in" }),
    );

    const payload = { email: "new@example.com", name: "New User", password: "password123" };
    await expect(result.current.signUpEmail(payload)).rejects.toThrow(
      new ApplicationError("USER_UNAUTHENTICATED", { message: "Email already in use" }),
    );
    await expect(result.current.signUpEmail(payload)).rejects.toThrow(
      new ApplicationError("USER_UNAUTHENTICATED", { message: "Failed to sign up" }),
    );

    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
