import { createServerFn } from "@tanstack/react-start";
import { getSessionManifest as dbGetSessionManifest } from "@/shared/db";
import {
	type RecordAttemptInput,
	RecordAttemptInputSchema,
	type RecordAttemptResult,
} from "../model/attempt";
import { recordAttemptAction } from "./record-attempt";

export const getVodDetails = createServerFn({ method: "GET" })
	.validator((vodId: string) => vodId)
	.handler(async ({ data: vodId }) => {
		return dbGetSessionManifest(vodId);
	});

export interface GetSessionManifestPayload {
	modules?: string[];
	publishedOnly?: boolean;
	vodId: string;
}

export const getSessionManifest = createServerFn({ method: "GET" })
	.validator((input: GetSessionManifestPayload) => input)
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
