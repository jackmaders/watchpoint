import { vi } from "vitest";
import { dbSuccess } from "../../common/result";
import { heroRoleEnum, inputTypeEnum, moduleTypeEnum } from "../schema";

export const getPublishedVods = vi.fn(async () => dbSuccess([]));
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
		title: "Updated Mock VOD",
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
export const getSessionManifest = vi.fn(async () => dbSuccess(null));
export const validateScenarioConfig = vi.fn(() => ({ valid: true }));
export const validateVodForPublishing = vi.fn(() => ({ valid: true }));

export { heroRoleEnum, inputTypeEnum, moduleTypeEnum };
