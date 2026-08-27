import type { DbContext, PlayerHistoryItem } from "@/shared/db";
import { playthroughService } from "@/shared/db";
import { getCurrentUser } from "@/shared/lib/auth";

export async function getPlaythroughHistoryDetailData(
	playthroughId: string,
	context?: DbContext,
): Promise<PlayerHistoryItem | null> {
	const user = await getCurrentUser(undefined, context);
	if (!user) {
		throw new Error("Authentication required");
	}
	const result = await playthroughService.getHistoryDetail(
		playthroughId,
		user.id,
		context,
	);
	if (!result.success) {
		throw new Error(`Failed to lookup playthrough detail: ${result.error}`);
	}
	return result.data;
}
