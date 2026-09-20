import { createAuthClient } from "better-auth/react";

// The auth endpoint is same-origin at Better Auth's default `/api/auth` path.
export const authClient = createAuthClient();
