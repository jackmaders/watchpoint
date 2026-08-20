import { vi } from "vitest";
import {
	heroRoleEnum,
	inputTypeEnum,
	moduleTypeEnum,
	userRoleEnum,
} from "../schema";

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
export const getUsers = vi.fn(async () => []);
export const getUserById = vi.fn(async () => null);
export const getUserCount = vi.fn(async () => 0);
export const updateUserRole = vi.fn(async () => ({ success: true }));
export const getAdminVods = vi.fn(async () => []);
export const getVodById = vi.fn(async () => null);
export const createVod = vi.fn(async () => ({ success: true, vod: {} }));
export const updateVod = vi.fn(async () => ({ success: true, vod: {} }));
export const deleteVod = vi.fn(async () => ({ success: true }));
export const setVodPublicationStatus = vi.fn(async () => ({
	success: true,
	vod: {},
}));
export const bulkPublishVods = vi.fn(async () => ({
	failed: [],
	succeeded: [],
}));
export const bulkDeleteVods = vi.fn(async () => ({
	failed: [],
	succeeded: [],
}));
export const getScenarioById = vi.fn(async () => null);
export const getScenariosByVodId = vi.fn(async () => []);
export const createScenario = vi.fn(async () => ({
	scenario: {},
	success: true,
}));
export const updateScenario = vi.fn(async () => ({
	scenario: {},
	success: true,
}));
export const deleteScenario = vi.fn(async () => ({ success: true }));
export const reorderScenarios = vi.fn(async () => ({ success: true }));
export const createAuditEntry = vi.fn(async () => null);
export const getAuditEntries = vi.fn(async () => []);
export const getAuditLogs = vi.fn(async () => []);
export const validateScenarioConfig = vi.fn(() => ({ valid: true }));
export const validateVodForPublishing = vi.fn(() => ({ valid: true }));
export { heroRoleEnum, inputTypeEnum, moduleTypeEnum, userRoleEnum };
