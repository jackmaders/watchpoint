/**
 * Domain rule logic for retrieving a player's interactive training playthrough history.
 *
 * Implements `getHistoryRule` enforcing authentication guards and querying playthrough
 * telemetry through `playthroughService.listHistory` without throwing runtime exceptions.
 */

import { type DbContext, playthroughService } from "@/shared/db";
import { getCurrentUser } from "@/shared/lib/auth";
import type { GetHistoryInput, GetHistoryResult } from "./types";

export async function getHistoryRule(
	options: GetHistoryInput = {},
	context?: DbContext,
): Promise<GetHistoryResult> {
	const user = await getCurrentUser(undefined, context);
	if (!user) {
		return { reason: "Authentication required", status: "rejected" };
	}

	const result = await playthroughService.listHistory(
		{ ...options, userId: user.id },
		context,
	);
	if (!result.success) {
		return { reason: result.error, status: "rejected" };
	}

	return { data: result.data, status: "success" };
}
