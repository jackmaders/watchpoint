import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { toast } from "@/shared/ui/shadcn/toast";

import type { auth } from "./auth.server";

const authClient = createAuthClient({
  fetchOptions: {
    onError(ctx) {
      const title = ctx.error.message || "Authentication failed";
      toast.add({ title, type: "error" });
    },
  },
  plugins: [inferAdditionalFields<typeof auth>()],
});
const { signIn, signOut, signUp, useSession } = authClient;

export { authClient, signIn, signOut, signUp, useSession };
