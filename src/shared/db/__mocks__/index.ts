import { vi } from "vitest";
import { getDb } from "../core/__mocks__/client";
import { dbSuccess } from "../core/result";
import { userRoleEnum } from "../schema/auth";
import { playthroughStatusEnum } from "../schema/playthroughs";
import { heroRoleEnum, inputTypeEnum, moduleTypeEnum } from "../schema/vods";

export { getDb };

export const getPublishedVods = vi.fn(async () => dbSuccess([]));
export const getSessionManifest = vi.fn(async () => dbSuccess(null));
export const completePlaythrough = vi.fn(async () => dbSuccess(null));
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
export const getPlaythrough = vi.fn(async () => dbSuccess(null));
export const getPlaythroughHistoryDetail = vi.fn(async () => dbSuccess(null));
export const getPlaythroughAttempts = vi.fn(async () => dbSuccess([]));
export const recordPlaythroughAttempt = vi.fn(async () => dbSuccess(null));
export const getAttemptByIdempotencyKey = vi.fn(async () => dbSuccess(null));
export const getUsers = vi.fn(async () => dbSuccess([]));
export const getUserById = vi.fn(async () => dbSuccess(null));
export const getUserCount = vi.fn(async () => dbSuccess(0));
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
export const getAdminVods = vi.fn(async () =>
	dbSuccess({
		items: [],
		page: 1,
		pageSize: 10,
		total: 0,
		totalPages: 1,
	}),
);
export const getVodById = vi.fn(async () => dbSuccess(null));
export const createVod = vi.fn(async () =>
	dbSuccess({
		createdAt: new Date(),
		durationSeconds: 600,
		heroName: "Ana",
		id: "mock_vod_id",
		isPublished: false,
		mapName: "Kings Row",
		rankTier: "Grandmaster",
		role: "SUPPORT" as const,
		title: "Mock VOD",
		youtubeVideoId: "mock_video_id",
	}),
);
export const updateVod = vi.fn(async () =>
	dbSuccess({
		createdAt: new Date(),
		durationSeconds: 600,
		heroName: "Ana",
		id: "mock_vod_id",
		isPublished: false,
		mapName: "Kings Row",
		rankTier: "Grandmaster",
		role: "SUPPORT" as const,
		title: "Mock VOD",
		youtubeVideoId: "mock_video_id",
	}),
);
export const deleteVod = vi.fn(async () => dbSuccess(undefined));
export const setVodPublicationStatus = vi.fn(async () =>
	dbSuccess({
		createdAt: new Date(),
		durationSeconds: 600,
		heroName: "Ana",
		id: "mock_vod_id",
		isPublished: true,
		mapName: "Kings Row",
		rankTier: "Grandmaster",
		role: "SUPPORT" as const,
		title: "Mock VOD",
		youtubeVideoId: "mock_video_id",
	}),
);
export const bulkPublishVods = vi.fn(async () =>
	dbSuccess({
		failed: [],
		succeeded: [],
	}),
);
export const bulkDeleteVods = vi.fn(async () =>
	dbSuccess({
		failed: [],
		succeeded: [],
	}),
);
export const getScenarioById = vi.fn(async () => dbSuccess(null));
export const getScenariosByVodId = vi.fn(async () => dbSuccess([]));
export const createScenario = vi.fn(async () =>
	dbSuccess({
		explanationText: "Mock explanation",
		id: "mock_scenario_id",
		imageUrl: null,
		inputConfig: {},
		inputType: "MULTIPLE_CHOICE" as const,
		moduleType: "STRATEGY" as const,
		promptText: "Mock prompt",
		timeLimitSeconds: null,
		timestampSeconds: 60,
		vodId: "mock_vod_id",
	}),
);
export const updateScenario = vi.fn(async () =>
	dbSuccess({
		explanationText: "Updated explanation",
		id: "mock_scenario_id",
		imageUrl: null,
		inputConfig: {},
		inputType: "MULTIPLE_CHOICE" as const,
		moduleType: "STRATEGY" as const,
		promptText: "Updated prompt",
		timeLimitSeconds: null,
		timestampSeconds: 60,
		vodId: "mock_vod_id",
	}),
);
export const deleteScenario = vi.fn(async () => dbSuccess(undefined));
export const reorderScenarios = vi.fn(async () => dbSuccess(undefined));
export const createAuditEntry = vi.fn(async () => dbSuccess(null));
export const getAuditEntries = vi.fn(async () => dbSuccess([]));
export const getAuditLogs = vi.fn(async () =>
	dbSuccess({
		items: [],
		page: 1,
		pageSize: 10,
		total: 0,
		totalPages: 1,
	}),
);
export const validateScenarioConfig = vi.fn(() => ({ valid: true }));
export const validateVodForPublishing = vi.fn(() => ({ valid: true }));

export const mockAuditService = {
	create: createAuditEntry,
	list: getAuditLogs,
	listByEntity: getAuditEntries,
	listLogs: getAuditLogs,
};
export const auditService = mockAuditService;

export const mockAuthService = {
	getById: getUserById,
	getUserCount: getUserCount,
	listUsers: getUsers,
	updateUserRole: updateUserRole,
};
export const authService = mockAuthService;

export const mockVodService = {
	bulkDelete: bulkDeleteVods,
	bulkPublish: bulkPublishVods,
	create: createVod,
	createScenario: createScenario,
	delete: deleteVod,
	deleteScenario: deleteScenario,
	getById: getVodById,
	getScenarioById: getScenarioById,
	getScenariosByVodId: getScenariosByVodId,
	getSessionManifest: getSessionManifest,
	listAdmin: getAdminVods,
	listPublished: getPublishedVods,
	reorderScenarios: reorderScenarios,
	setPublicationStatus: setVodPublicationStatus,
	update: updateVod,
	updateScenario: updateScenario,
};
export const vodService = mockVodService;

export const mockPlaythroughService = {
	complete: completePlaythrough,
	create: createPlaythrough,
	getAttemptByIdempotencyKey: getAttemptByIdempotencyKey,
	getAttempts: getPlaythroughAttempts,
	getById: getPlaythrough,
	getHistoryDetail: getPlaythroughHistoryDetail,
	listHistory: queryPlayerHistory,
	recordAttempt: recordPlaythroughAttempt,
};
export const playthroughService = mockPlaythroughService;

export {
	heroRoleEnum,
	inputTypeEnum,
	moduleTypeEnum,
	playthroughStatusEnum,
	userRoleEnum,
};
