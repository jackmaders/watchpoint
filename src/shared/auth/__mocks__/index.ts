import { vi } from "vite-plus/test";

import { ApplicationError } from "@/shared/errors";

import { signIn, signOut, signUp, useSession } from "./auth.client";

function throwIfAuthError(result: unknown, fallbackMessage: string): void {
  if (
    typeof result === "object" &&
    result !== null &&
    "error" in result &&
    typeof result.error === "object" &&
    result.error !== null
  ) {
    const message =
      "message" in result.error &&
      typeof result.error.message === "string" &&
      result.error.message.length > 0
        ? result.error.message
        : fallbackMessage;
    throw new ApplicationError("USER_UNAUTHENTICATED", { message });
  }
}

const signOutMock = vi.fn<(...args: Parameters<typeof signOut>) => ReturnType<typeof signOut>>(
  async (...args) => await signOut(...args),
);

const signInEmailMock = vi.fn<
  (...args: Parameters<typeof signIn.email>) => ReturnType<typeof signIn.email>
>(async (...args) => {
  const result = await signIn.email(...args);
  throwIfAuthError(result, "Failed to sign in");
  return result;
});

const signUpEmailMock = vi.fn<
  (...args: Parameters<typeof signUp.email>) => ReturnType<typeof signUp.email>
>(async (...args) => {
  const result = await signUp.email(...args);
  throwIfAuthError(result, "Failed to sign up");
  return result;
});

const useAuth = vi.fn<
  () => ReturnType<typeof useSession> & {
    signInEmail: typeof signInEmailMock;
    signOut: typeof signOutMock;
    signUpEmail: typeof signUpEmailMock;
  }
>(() => {
  const session = useSession();
  return {
    ...session,
    signInEmail: signInEmailMock,
    signOut: signOutMock,
    signUpEmail: signUpEmailMock,
  };
});

export { useAuth };
export { authClient, mockAuthClient, signIn, signOut, signUp, useSession } from "./auth.client";
export { getSessionFn } from "./session.functions";
export { permissionMiddleware } from "../middleware";
export { hasPermission } from "../permissions";
export type { Session } from "../session.types";
