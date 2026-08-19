import { vi } from "vitest";

export const authClient = {
	signIn: { email: vi.fn().mockResolvedValue({ data: {}, error: null }) },
	signOut: vi.fn().mockResolvedValue({ data: {}, error: null }),
	signUp: { email: vi.fn().mockResolvedValue({ data: {}, error: null }) },
	useSession: vi.fn().mockReturnValue({ data: null, isPending: false }),
};
