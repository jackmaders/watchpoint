/**
 * Data-access logic for loading a user's chronological training playthrough history.
 *
 * Implements `getPlayerHistoryData` by authenticating the current user and querying
 * `playthroughService.listHistory` with pagination and status filters.
 */
import type {
	DbContext,
	GetPlayerHistoryOptions,
	PlayerHistoryResult,
} from "@/shared/db";
import { playthroughService } from "@/shared/db";
import { getCurrentUser } from "@/shared/lib/auth";

export async function getPlayerHistoryData(
	options: GetPlayerHistoryOptions = {},
	context?: DbContext,
): Promise<PlayerHistoryResult> {
	const user = await getCurrentUser(undefined, context);
	if (!user) {
		throw new Error("Authentication required");
	}

	const result = await playthroughService.listHistory(
		{ ...options, userId: user.id },
		context,
	);
	if (!result.success) {
		throw new Error(result.error);
	}
	return result.data;
}
