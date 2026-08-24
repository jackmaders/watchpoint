import type { DbContext, PlayerHistoryItem } from "@/shared/db";
import { getPlaythroughHistoryDetail } from "@/shared/db";
import { getCurrentUser } from "@/shared/lib/auth";

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
