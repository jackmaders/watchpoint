import { vi } from "vitest";

interface QueryOptions {
	where?: (vods: unknown, ops: Record<string, unknown>) => void;
	with?: {
		scenarios?: {
			orderBy?: (scenarios: unknown, ops: Record<string, unknown>) => void;
		};
	};
}

const createMockQueryFn = () => {
	const mockFn = vi.fn();
	const fn = vi.fn((options?: QueryOptions) => {
		if (typeof options?.where === "function") {
			options.where({}, { and: vi.fn(), eq: vi.fn() });
		}
		if (typeof options?.with?.scenarios?.orderBy === "function") {
			options.with.scenarios.orderBy({}, { asc: vi.fn(), desc: vi.fn() });
		}
		return mockFn(options);
	});
	fn.mockResolvedValueOnce = (val: unknown) => {
		mockFn.mockResolvedValueOnce(val);
		return fn;
	};
	fn.mockResolvedValue = (val: unknown) => {
		mockFn.mockResolvedValue(val);
		return fn;
	};
	return fn;
};

const createMockInsertFn = () => {
	const returningFn = vi.fn().mockResolvedValue([{ id: "mock_attempt_id" }]);
	const valuesFn = vi.fn((_val: unknown) => ({
		returning: returningFn,
	}));
	const insertFn = vi.fn((_table: unknown) => ({
		values: valuesFn,
	}));
	return insertFn;
};

const db = {
	insert: createMockInsertFn(),
	query: {
		attemptRecords: {
			findFirst: createMockQueryFn(),
			findMany: createMockQueryFn(),
		},
		scenarios: {
			findFirst: createMockQueryFn(),
			findMany: createMockQueryFn(),
		},
		vods: {
			findFirst: createMockQueryFn(),
			findMany: createMockQueryFn(),
		},
	},
};

export const getDb = vi.fn(() => db);
