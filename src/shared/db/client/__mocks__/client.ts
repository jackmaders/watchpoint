import { vi } from "vitest";

interface QueryOptions {
	orderBy?: (table: unknown, ops: Record<string, unknown>) => void;
	where?: (vods: unknown, ops: Record<string, unknown>) => void;
	with?: {
		scenarios?: {
			orderBy?: (scenarios: unknown, ops: Record<string, unknown>) => void;
		};
		scenarioSnapshots?: {
			orderBy?: (snapshots: unknown, ops: Record<string, unknown>) => void;
			where?: (snapshot: unknown, ops: Record<string, unknown>) => void;
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
		if (typeof options?.with?.scenarioSnapshots?.orderBy === "function") {
			options.with.scenarioSnapshots.orderBy(
				{},
				{ asc: vi.fn(), desc: vi.fn() },
			);
		}
		if (typeof options?.with?.scenarioSnapshots?.where === "function") {
			options.with.scenarioSnapshots.where({}, { eq: vi.fn() });
		}
		if (typeof options?.orderBy === "function") {
			options.orderBy({}, { asc: vi.fn(), desc: vi.fn() });
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

const createMockUpdateFn = () => {
	const returningFn = vi
		.fn()
		.mockResolvedValue([{ id: "mock_playthrough_id" }]);
	const whereFn = vi.fn(() => ({ returning: returningFn }));
	const setFn = vi.fn(() => ({ where: whereFn }));
	return vi.fn((_table: unknown) => ({ set: setFn }));
};

const db = {
	insert: createMockInsertFn(),
	query: {
		attemptRecords: {
			findFirst: createMockQueryFn(),
			findMany: createMockQueryFn(),
		},
		auditEntries: {
			findMany: createMockQueryFn(),
		},
		playthroughModuleSelections: {
			findMany: createMockQueryFn(),
		},
		playthroughs: {
			findFirst: createMockQueryFn(),
			findMany: createMockQueryFn(),
		},
		scenarioSnapshots: {
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
	update: createMockUpdateFn(),
};

const transaction = vi.fn(async (callback: (database: typeof db) => unknown) =>
	callback(db),
);

Object.assign(db, { transaction });

export const getDb = vi.fn(() => db);
