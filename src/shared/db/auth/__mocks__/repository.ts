import { vi } from "vitest";
import { dbSuccess } from "../../common/result";

export const getUserCount = vi.fn(async () => dbSuccess(0));
export const getUserById = vi.fn(async () => dbSuccess(null));
export const getUsers = vi.fn(async () => dbSuccess([]));
export const updateUserRole = vi.fn(async () =>
	dbSuccess({
		createdAt: new Date(),
		email: "user@example.com",
		emailVerified: false,
		id: "mock_user_id",
		image: null,
		isTestAccount: false,
		name: "Mock User",
		role: "PLAYER" as const,
		updatedAt: new Date(),
	}),
);
