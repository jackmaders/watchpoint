/**
 * Server functions and input validator schemas for retrieving individual playthrough performance details.
 *
 * Implements `getPlaythroughHistoryDetail` using TanStack Start `createServerFn`, validating playthrough ID
 * parameters and delegating execution to `getHistoryDetailRule`.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getHistoryDetailRule } from "../model/get-history-detail";
import type { GetHistoryDetailResult } from "../model/types";

export const GetHistoryDetailSchema = z.object({
	id: z.string().min(1, "Playthrough ID is required"),
});

export type GetHistoryDetailPayload = z.infer<typeof GetHistoryDetailSchema>;

export const getPlaythroughHistoryDetail = createServerFn({ method: "GET" })
	.validator((data: unknown) => {
		const parsed = GetHistoryDetailSchema.safeParse(data);
		if (!parsed.success) {
			throw new Error("Invalid playthrough detail query payload");
		}
		return parsed.data;
	})
	.handler(async ({ data }): Promise<GetHistoryDetailResult> => {
		return getHistoryDetailRule(data);
	});
