import { vi } from "vitest";

export const hashPassword = vi.fn(
	async (password: string) => `hashed_${password}`,
);
