import { useRouter } from "@tanstack/react-router";
import { useCallback } from "react";

import { ApplicationError } from "../errors";
import { authClient, useSession } from "./auth.client";

function throwAuthError(error: { message?: string | undefined }, fallbackMessage: string): never {
  const message =
    error.message !== undefined && error.message.length > 0 ? error.message : fallbackMessage;
  throw new ApplicationError("USER_UNAUTHENTICATED", { message });
}

export function useAuth() {
  const router = useRouter({ warn: false });

  const session = useSession();

  const signOut = useCallback(
    async (...args: Parameters<typeof authClient.signOut>) => {
      const result = await authClient.signOut(...args);
      await router.invalidate();
      return result;
    },
    [router],
  );

  const signInEmail = useCallback(
    async (...args: Parameters<typeof authClient.signIn.email>) => {
      const result = await authClient.signIn.email(...args);
      if (result.error) {
        throwAuthError(result.error, "Failed to sign in");
      }
      await router.invalidate();
      return result;
    },
    [router],
  );

  const signUpEmail = useCallback(
    async (...args: Parameters<typeof authClient.signUp.email>) => {
      const result = await authClient.signUp.email(...args);
      if (result.error) {
        throwAuthError(result.error, "Failed to sign up");
      }
      await router.invalidate();
      return result;
    },
    [router],
  );

  return {
    ...session,
    signInEmail,
    signOut,
    signUpEmail,
  };
}
