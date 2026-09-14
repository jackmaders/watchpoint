/**
 * TanStack Start server functions for VOD discovery, manifest loading, attempt recording, and playthrough lifecycles.
 *
 * Exposes RPC endpoints (`getPublishedVods`, `getVodById`, `getSessionManifest`, `getProtectedSessionManifest`,
 * `startPlaythrough`, `recordAttempt`, `completePlaythrough`) bridging client components and server actions
 * to D1 query functions.
 */
import { createServerFn } from "@tanstack/react-start";
import {
	createDbClient,
	getVodById as dbGetVodById,
	queryScenarios,
	queryVods,
} from "@/shared/db";
import { getCurrentUser } from "@/shared/lib/auth";
import {
	type RecordAttemptInput,
	RecordAttemptInputSchema,
	type RecordAttemptResult,
} from "../model/attempt";
import type { PublishedVodItem, SessionManifest } from "../model/types";
import {
	completePlaythroughAction,
	type StartPlaythroughInput,
	startPlaythroughAction,
} from "./playthrough";
import { recordAttemptAction } from "./record-attempt";
import {
	normalizeSessionManifestQuery,
	type SessionManifestTransportQuery,
} from "./session-manifest-query";

export type GetSessionManifestPayload = SessionManifestTransportQuery;

export const getPublishedVods = createServerFn({ method: "GET" }).handler(
	async (): Promise<PublishedVodItem[]> => {
		const db = createDbClient();
		const vodList = await queryVods(
			{
				filter: { isPublished: { eq: true } },
				order: { createdAt: "desc" },
			},
			db,
		);
		if (vodList.length === 0) {
			return [];
		}
		const scenariosList = await queryScenarios(
			{
				filter: {
					vodId: { in: vodList.map((v) => v.id) },
				},
			},
			db,
		);
		const scenariosByVodId = new Map<string, Array<{ id: string }>>();
		for (const scenario of scenariosList) {
			const list = scenariosByVodId.get(scenario.vodId) ?? [];
			list.push({ id: scenario.id });
			scenariosByVodId.set(scenario.vodId, list);
		}
		return vodList.map((vod) => ({
			...vod,
			scenarios: scenariosByVodId.get(vod.id) ?? [],
		}));
	},
);

export const getVodById = createServerFn({ method: "GET" })
	.validator((data: { id: string }) => data)
	.handler(async ({ data }): Promise<SessionManifest | null> => {
		const db = createDbClient();
		const vod = await dbGetVodById(data.id, db);
		if (!vod) {
			return null;
		}
		const scenarios = await queryScenarios(
			{
				filter: { vodId: { eq: data.id } },
				order: { timestampSeconds: "asc" },
			},
			db,
		);
		return {
			...vod,
			scenarios,
		};
	});

export const getSessionManifest = createServerFn({ method: "GET" })
	.validator(normalizeSessionManifestQuery)
	.handler(async ({ data }): Promise<SessionManifest | null> => {
		const db = createDbClient();
		const vod = await dbGetVodById(data.vodId, db);
		if (!vod) {
			return null;
		}

		const filter: Record<string, unknown> = {
			vodId: { eq: data.vodId },
		};
		if (data.modules && data.modules.length > 0) {
			filter.moduleType = { in: data.modules };
		}

		const scenarios = await queryScenarios(
			{
				filter,
				order: { timestampSeconds: "asc" },
			},
			db,
		);

		return {
			...vod,
			scenarios,
		};
	});

export const getProtectedSessionManifest = createServerFn({ method: "GET" })
	.validator(normalizeSessionManifestQuery)
	.handler(async ({ data }): Promise<SessionManifest | null> => {
		if (!(await getCurrentUser())) {
			throw new Error("Authentication required");
		}

		const db = createDbClient();
		const vod = await dbGetVodById(data.vodId, db);
		if (!vod) {
			return null;
		}

		const filter: Record<string, unknown> = {
			vodId: { eq: data.vodId },
		};
		if (data.modules && data.modules.length > 0) {
			filter.moduleType = { in: data.modules };
		}

		const scenarios = await queryScenarios(
			{
				filter,
				order: { timestampSeconds: "asc" },
			},
			db,
		);

		return {
			...vod,
			scenarios,
		};
	});

export const recordAttempt = createServerFn({ method: "POST" })
	.validator((payload: RecordAttemptInput) => {
		const parsed = RecordAttemptInputSchema.safeParse(payload);
		if (!parsed.success) {
			throw new Error("Invalid attempt payload");
		}
		return parsed.data;
	})
	.handler(async ({ data }): Promise<RecordAttemptResult> => {
		return recordAttemptAction(data);
	});

export const startPlaythrough = createServerFn({ method: "POST" })
	.validator((payload: StartPlaythroughInput) => payload)
	.handler(async ({ data }) => startPlaythroughAction(data));

export const completePlaythrough = createServerFn({ method: "POST" })
	.validator((payload: { playthroughId: string }) => payload)
	.handler(async ({ data }) => completePlaythroughAction(data.playthroughId));
