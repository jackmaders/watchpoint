import { vi } from "vitest";

export const mockOctokit = {
	graphql: vi.fn().mockResolvedValue({
		addSubIssue: {
			issue: { id: "I_kw123" },
			subIssue: { id: "I_kw456" },
		},
	}),
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
			create: vi.fn().mockImplementation(async (params) => ({
				data: {
					body: params.body ?? "",
					id: 101,
					labels: params.labels ?? [],
					milestone: params.milestone ? { number: params.milestone } : null,
					node_id: "I_kw_child101",
					number: 101,
					state: "open",
					title: params.title ?? "Mock Ticket",
				},
			})),
			createComment: vi.fn().mockResolvedValue({}),
			createMilestone: vi.fn().mockResolvedValue({
				data: {
					number: 1,
					title: "[Spec] Feature",
				},
			}),
			get: vi.fn().mockResolvedValue({
				data: {
					body: "Original body",
					id: 42,
					labels: [],
					node_id: "I_kw_parent42",
					number: 42,
					title: "Feature Spec Title",
				},
			}),
			listComments: vi.fn().mockResolvedValue([]),
			listForRepo: vi.fn().mockResolvedValue({ data: [] }),
			listMilestones: vi.fn().mockResolvedValue({ data: [] }),
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
