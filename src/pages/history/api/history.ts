import type {
	DbContext,
	GetPlayerHistoryOptions,
	PlayerHistoryResult,
} from "@/shared/db";
import { queryPlayerHistory } from "@/shared/db";
import { getCurrentUser } from "@/shared/lib/auth";

export async function getPlayerHistoryData(
	options: GetPlayerHistoryOptions = {},
	context?: DbContext,
): Promise<PlayerHistoryResult> {
	const user = await getCurrentUser(undefined, context);
	if (!user) {
		throw new Error("Authentication required");
	}

	const result = await queryPlayerHistory(user.id, options, context);
	if (!result.success) {
		throw new Error(result.error);
	}
	return result.data;
}
