import { vi } from "vitest";

export const db = {
	attemptRecord: {
		create: vi.fn(),
		findFirst: vi.fn(),
		findMany: vi.fn(),
	},
	scenario: {
		findFirst: vi.fn(),
		findMany: vi.fn(),
		findUnique: vi.fn(),
	},
	vod: {
		count: vi.fn(),
		findFirst: vi.fn(),
		findMany: vi.fn(),
		findUnique: vi.fn(),
	},
};
