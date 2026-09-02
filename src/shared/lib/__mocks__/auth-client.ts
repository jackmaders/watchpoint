/**
 * Test mock for the browser-side Better Auth client, simulating session state and authentication workflows.
 *
 * Exports mock implementations of `authClient`, `signInEmail`, `signUpEmail`, `signOut`, and `useSession`
 * using Vitest spy functions (`vi.fn()`) to enable isolated component testing without network calls.
 */

import { vi } from "vitest";

export const signInEmail = vi.fn().mockResolvedValue({ data: {}, error: null });
export const signUpEmail = vi.fn().mockResolvedValue({ data: {}, error: null });
export const signOut = vi.fn().mockResolvedValue({ data: {}, error: null });
export const useSession = vi.fn(() => ({ data: null, isPending: false }));

export const authClient = {
	signIn: { email: signInEmail },
	signOut,
	signUp: { email: signUpEmail },
	useSession,
};
