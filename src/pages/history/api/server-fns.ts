/**
 * Server functions and input validator schemas for retrieving a player's training playthrough history.
 *
 * Implements `getPlayerHistory` using TanStack Start `createServerFn`, validating search filter parameters
 * and delegating execution to `getHistoryRule`.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getHistoryRule } from "../model/get-history";
import type { GetHistoryResult } from "../model/types";

export const GetPlayerHistorySchema = z.object({
	modules: z
		.array(z.enum(["STRATEGY", "TACTICS", "ULTIMATE", "COOLDOWN", "SPATIAL"]))
		.optional(),
	page: z.number().int().positive().optional(),
	pageSize: z.number().int().positive().optional(),
	status: z.enum(["IN_PROGRESS", "COMPLETED"]).optional(),
	vodId: z.string().optional(),
});

export type GetPlayerHistoryPayload = z.infer<typeof GetPlayerHistorySchema>;

export const getPlayerHistory = createServerFn({ method: "GET" })
	.validator((data: unknown) => {
		const parsed = GetPlayerHistorySchema.safeParse(data ?? {});
		if (!parsed.success) {
			throw new Error("Invalid player history query payload");
		}
		return parsed.data;
	})
	.handler(async ({ data }): Promise<GetHistoryResult> => {
		return getHistoryRule(data);
	});
