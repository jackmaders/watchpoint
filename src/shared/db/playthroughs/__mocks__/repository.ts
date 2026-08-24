import { vi } from "vitest";
import { dbSuccess } from "../../common/result";

export const createPlaythrough = vi.fn(async () =>
	dbSuccess({
		completedAt: null,
		createdAt: new Date(),
		id: "mock_playthrough_id",
		status: "IN_PROGRESS" as const,
		userId: "mock_user_id",
		vodId: "mock_vod_id",
	}),
);
export const getPlaythrough = vi.fn(async () => dbSuccess(null));
export const getPlayerHistory = vi.fn(async () => dbSuccess([]));
export const queryPlayerHistory = vi.fn(async () =>
	dbSuccess({
		items: [],
		page: 1,
		pageSize: 10,
		total: 0,
		totalPages: 1,
	}),
);
export const getPlaythroughHistoryDetail = vi.fn(async () => dbSuccess(null));
export const completePlaythrough = vi.fn(async () => dbSuccess(null));
export const recordPlaythroughAttempt = vi.fn(async () => dbSuccess(null));
export const getPlaythroughAttempts = vi.fn(async () => dbSuccess([]));
export const getAttemptByIdempotencyKey = vi.fn(async () => dbSuccess(null));
