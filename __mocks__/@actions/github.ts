import { vi } from "vitest";

export const mockOctokit = {
	paginate: vi.fn(
		async (
			method: (params: unknown) => Promise<{ data: unknown[] }>,
			params: unknown,
		) => {
			const res = await method(params);
			return Array.isArray(res) ? res : (res.data ?? []);
		},
	),
	rest: {
		issues: {
			addLabels: vi.fn().mockResolvedValue({}),
			createComment: vi.fn().mockResolvedValue({}),
			get: vi
				.fn()
				.mockResolvedValue({ data: { body: "Original body", labels: [] } }),
			listComments: vi.fn().mockResolvedValue([]),
			removeLabel: vi.fn().mockResolvedValue({}),
			update: vi.fn().mockResolvedValue({}),
		},
	},
};

export const getOctokit = vi.fn().mockReturnValue(mockOctokit);

export const context = {
	issue: {
		number: 42,
	},
	repo: {
		owner: "jackmaders",
		repo: "watchpoint",
	},
};
