import { createServerFn } from "@tanstack/react-start";
import { getSessionManifest as dbGetSessionManifest } from "@/shared/db";
import {
	type RecordAttemptInput,
	RecordAttemptInputSchema,
	type RecordAttemptResult,
} from "../model/attempt";
import { recordAttemptAction } from "./record-attempt";
import {
	normalizeSessionManifestQuery,
	type SessionManifestTransportQuery,
} from "./session-manifest-query";

export type GetSessionManifestPayload = SessionManifestTransportQuery;

export const getSessionManifest = createServerFn({ method: "GET" })
	.validator(normalizeSessionManifestQuery)
	.handler(async ({ data }) => {
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
