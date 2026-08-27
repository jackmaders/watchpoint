import { vi } from "vitest";
import { userRoleEnum } from "../auth/schema";
import { dbSuccess } from "../core/result";
import { playthroughStatusEnum } from "../playthroughs/schema";
import { heroRoleEnum, inputTypeEnum, moduleTypeEnum } from "../vods/schema";

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
export const getAdminVods = vi.fn(async () => dbSuccess([]));
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
export const getAuditLogs = vi.fn(async () => dbSuccess([]));
export const validateScenarioConfig = vi.fn(() => ({ valid: true }));
export const validateVodForPublishing = vi.fn(() => ({ valid: true }));

export {
	heroRoleEnum,
	inputTypeEnum,
	moduleTypeEnum,
	playthroughStatusEnum,
	userRoleEnum,
};
