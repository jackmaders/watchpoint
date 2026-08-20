import type {
	DbContext,
	GetPlayerHistoryOptions,
	PlayerHistoryItem,
	PlayerHistoryResult,
} from "@/shared/db";
import { getPlaythroughHistoryDetail, queryPlayerHistory } from "@/shared/db";
import { getCurrentUser } from "@/shared/lib/auth";

export async function getPlayerHistoryData(
	options: GetPlayerHistoryOptions = {},
	context?: DbContext,
): Promise<PlayerHistoryResult> {
	const user = await getCurrentUser(undefined, context);
	if (!user) {
		throw new Error("Authentication required");
	}

	return queryPlayerHistory(user.id, options, context);
}

export async function getPlaythroughHistoryDetailData(
	playthroughId: string,
	context?: DbContext,
): Promise<PlayerHistoryItem | null> {
	const user = await getCurrentUser(undefined, context);
	if (!user) {
		throw new Error("Authentication required");
	}

	return getPlaythroughHistoryDetail(playthroughId, user.id, context);
}
