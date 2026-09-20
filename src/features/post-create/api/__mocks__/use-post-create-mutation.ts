import { vi } from "vitest";

const postCreateMutation = {
	isPending: false,
	mutateAsync: vi.fn(),
};

export const usePostCreateMutation = vi.fn(() => postCreateMutation);
