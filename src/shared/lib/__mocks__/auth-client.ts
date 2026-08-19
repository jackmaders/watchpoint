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
