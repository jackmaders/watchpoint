/**
 * Provides the shared browser-side authentication client for managing player sessions,
 * sign-in operations, and credential lifecycles across the application.
 *
 * Instantiates and exports `authClient` via Better Auth React client (`createAuthClient`),
 * providing reactive session hooks and authentication methods consumed by client UI components.
 */

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();
