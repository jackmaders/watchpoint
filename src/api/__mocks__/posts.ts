import { vi } from "vitest";

const createPostMutation = {
	isPending: false,
	mutateAsync: vi.fn(),
};
export const useCreatePostMutation = vi.fn(() => createPostMutation);
