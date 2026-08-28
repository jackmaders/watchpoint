import { vi } from "vitest";
import { getDb } from "../core/__mocks__/client";
import { dbSuccess } from "../core/result";
import { userRoleEnum } from "../schema/auth";
import { playthroughStatusEnum } from "../schema/playthroughs";
import { heroRoleEnum, inputTypeEnum, moduleTypeEnum } from "../schema/vods";

export { getDb };

export const mockAuditService = {
	create: vi.fn(async () => dbSuccess(null)),
	list: vi.fn(async () =>
		dbSuccess({
			items: [],
			page: 1,
			pageSize: 10,
			total: 0,
			totalPages: 1,
		}),
	),
	listByEntity: vi.fn(async () => dbSuccess([])),
};
export const auditService = mockAuditService;

export const mockAuthService = {
	count: vi.fn(async () => dbSuccess(0)),
	getById: vi.fn(async () => dbSuccess(null)),
	list: vi.fn(async () =>
		dbSuccess({
			items: [],
			page: 1,
			pageSize: 10,
			total: 0,
			totalPages: 1,
		}),
	),
	updateUserRole: vi.fn(async () =>
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
	),
};
export const authService = mockAuthService;

export const mockVodService = {
	bulkDelete: vi.fn(async () =>
		dbSuccess({
			failed: [],
			succeeded: [],
		}),
	),
	bulkPublish: vi.fn(async () =>
		dbSuccess({
			failed: [],
			succeeded: [],
		}),
	),
	create: vi.fn(async () =>
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
	),
	createScenario: vi.fn(async () =>
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
	),
	delete: vi.fn(async () => dbSuccess(undefined)),
	deleteScenario: vi.fn(async () => dbSuccess(undefined)),
	getById: vi.fn(async () => dbSuccess(null)),
	getScenarioById: vi.fn(async () => dbSuccess(null)),
	getScenariosByVodId: vi.fn(async () => dbSuccess([])),
	getSessionManifest: vi.fn(async () => dbSuccess(null)),
	listAdmin: vi.fn(async () =>
		dbSuccess({
			items: [],
			page: 1,
			pageSize: 10,
			total: 0,
			totalPages: 1,
		}),
	),
	listPublished: vi.fn(async () => dbSuccess([])),
	reorderScenarios: vi.fn(async () => dbSuccess(undefined)),
	setPublicationStatus: vi.fn(async () =>
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
	),
	update: vi.fn(async () =>
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
	),
	updateScenario: vi.fn(async () =>
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
	),
};
export const vodService = mockVodService;

export const mockPlaythroughService = {
	complete: vi.fn(async () => dbSuccess(null)),
	create: vi.fn(async () =>
		dbSuccess({
			completedAt: null,
			createdAt: new Date(),
			id: "mock_playthrough_id",
			status: "IN_PROGRESS" as const,
			userId: "mock_user_id",
			vodId: "mock_vod_id",
		}),
	),
	getAttemptByIdempotencyKey: vi.fn(async () => dbSuccess(null)),
	getAttempts: vi.fn(async () => dbSuccess([])),
	getById: vi.fn(async () => dbSuccess(null)),
	getHistoryDetail: vi.fn(async () => dbSuccess(null)),
	listHistory: vi.fn(async () =>
		dbSuccess({
			items: [],
			page: 1,
			pageSize: 10,
			total: 0,
			totalPages: 1,
		}),
	),
	recordAttempt: vi.fn(async () => dbSuccess(null)),
};
export const playthroughService = mockPlaythroughService;

export const validateScenarioConfig = vi.fn(() => ({ valid: true }));
export const validateVodForPublishing = vi.fn(() => ({ valid: true }));

export {
	heroRoleEnum,
	inputTypeEnum,
	moduleTypeEnum,
	playthroughStatusEnum,
	userRoleEnum,
};
