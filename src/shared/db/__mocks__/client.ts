import { vi } from "vitest";

export const db = {
	attemptRecord: {
		create: vi.fn(),
		findMany: vi.fn(),
	},
	scenario: {
		findMany: vi.fn(),
		findUnique: vi.fn(),
	},
	vod: {
		count: vi.fn(),
		findMany: vi.fn(),
		findUnique: vi.fn(),
	},
};
