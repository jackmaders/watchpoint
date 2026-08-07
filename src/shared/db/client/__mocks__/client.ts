import { vi } from "vitest";

const db = {
	query: {
		attemptRecords: {
			findFirst: vi.fn(),
			findMany: vi.fn(),
		},
		scenarios: {
			findFirst: vi.fn(),
			findMany: vi.fn(),
		},
		vods: {
			findFirst: vi.fn(),
			findMany: vi.fn(),
		},
	},
};

export const getDb = vi.fn(() => db);
export const getPrismaClient = getDb;
