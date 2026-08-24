import { createServerFn } from "@tanstack/react-start";
import {
	getPublishedVods as dbGetPublishedVods,
	getSessionManifest as dbGetSessionManifest,
	getVodById as dbGetVodById,
	type PublishedVodItem,
} from "@/shared/db";
import { getCurrentUser } from "@/shared/lib/auth";
import {
	type RecordAttemptInput,
	RecordAttemptInputSchema,
	type RecordAttemptResult,
} from "../model/attempt";
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
		return dbGetPublishedVods();
	},
);

export const getVodById = createServerFn({ method: "GET" })
	.validator((data: { id: string }) => data)
	.handler(async ({ data }) => {
		return dbGetVodById(data.id);
	});

export const getSessionManifest = createServerFn({ method: "GET" })
	.validator(normalizeSessionManifestQuery)
	.handler(async ({ data }) => {
		return dbGetSessionManifest(data.vodId, {
			modules: data.modules,
			publishedOnly: data.publishedOnly,
		});
	});

export const getProtectedSessionManifest = createServerFn({ method: "GET" })
	.validator(normalizeSessionManifestQuery)
	.handler(async ({ data }) => {
		if (!(await getCurrentUser())) {
			throw new Error("Authentication required");
		}

		return dbGetSessionManifest(data.vodId, {
			modules: data.modules,
			publishedOnly: data.publishedOnly,
		});
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
