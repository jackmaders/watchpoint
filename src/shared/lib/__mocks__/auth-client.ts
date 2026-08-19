import { vi } from "vitest";

export const signInEmail = vi.fn();
export const signUpEmail = vi.fn();
export const signOut = vi.fn();
export const useSession = vi.fn(() => ({ data: null }));

export const authClient = {
	signIn: { email: signInEmail },
	signOut,
	signUp: { email: signUpEmail },
	useSession,
};
