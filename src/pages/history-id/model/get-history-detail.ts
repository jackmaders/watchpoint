/**
 * Domain rule logic for retrieving performance telemetry details for an individual training playthrough.
 *
 * Implements `getHistoryDetailRule` enforcing authentication guards and querying playthrough
 * details through `playthroughService.getHistoryDetail` without throwing runtime exceptions.
 */

import { type DbContext, playthroughService } from "@/shared/db";
import { getCurrentUser } from "@/shared/lib/auth";
import type { GetHistoryDetailInput, GetHistoryDetailResult } from "./types";

export async function getHistoryDetailRule(
	input: GetHistoryDetailInput,
	context?: DbContext,
): Promise<GetHistoryDetailResult> {
	const user = await getCurrentUser(undefined, context);
	if (!user) {
		return { reason: "Authentication required", status: "rejected" };
	}

	const result = await playthroughService.getHistoryDetail(
		{ playthroughId: input.id, userId: user.id },
		context,
	);
	if (!result.success) {
		return {
			reason: `Failed to lookup playthrough detail: ${result.error}`,
			status: "rejected",
		};
	}

	return { data: result.data, status: "success" };
}
