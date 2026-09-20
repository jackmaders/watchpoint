export const useSuspenseQuery = vi.fn(() => ({
	data: [],
}));
export const useQueryClient = vi.fn(() => ({
	invalidateQueries: vi.fn(),
}));

export const useMutation = vi.fn(() => ({
	isPending: false,
	mutateAsync: vi.fn(),
}));

export const queryOptions = vi.fn((options) => options);
