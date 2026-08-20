import { vi } from "vitest";
import { moduleTypeEnum } from "../schema";

export const getPublishedVods = vi.fn(async () => []);
export const getSessionManifest = vi.fn(async () => null);
export const completePlaythrough = vi.fn(async () => null);
export const createPlaythrough = vi.fn(async () => ({
	id: "mock_playthrough_id",
}));
export const getPlayerHistory = vi.fn(async () => []);
export const queryPlayerHistory = vi.fn(async () => ({
	items: [],
	page: 1,
	pageSize: 10,
	total: 0,
	totalPages: 1,
}));
export const getPlaythrough = vi.fn(async () => null);
export const getPlaythroughHistoryDetail = vi.fn(async () => null);
export const getPlaythroughAttempts = vi.fn(async () => []);
export { moduleTypeEnum };
