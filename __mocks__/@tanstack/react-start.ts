export const useServerFn = vi.fn((serverFn) => serverFn);
export const createServerFn = vi.fn(() => ({
	handler: vi.fn((fn) => fn),
	validator: vi.fn().mockReturnThis(),
	middleware: vi.fn().mockReturnThis(),
}));
