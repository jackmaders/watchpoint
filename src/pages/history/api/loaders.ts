/**
 * Data loader for the training match history page and search filter state.
 *
 * Implements `loadPlayerHistory` and `loadHistoryIndexPage` to concurrently fetch published VODs,
 * registration configuration, and paginated match history records.
 */
import { getPublishedVods } from "@/entities/vod";
import { isRegistrationOpen } from "@/shared/lib/auth";
import type { HistorySearchParams } from "../model/search-params";
import { getPlayerHistory } from "./server-fns";

export async function loadPlayerHistory(deps?: HistorySearchParams) {
	try {
		const historyData = await getPlayerHistory({
			data: {
				page: deps?.page,
				pageSize: deps?.pageSize,
				status: deps?.status,
				vodId: deps?.vodId,
			},
		});

		return {
			data: historyData,
			error: null,
		};
	} catch (error) {
		return {
			data: undefined,
			error:
				error instanceof Error ? error.message : "Failed to load match history",
		};
	}
}

export async function loadHistoryIndexPage({
	deps,
}: {
	deps: HistorySearchParams;
}) {
	const [vods, registrationEnabled, historyResult] = await Promise.all([
		getPublishedVods(),
		isRegistrationOpen(),
		loadPlayerHistory(deps),
	]);

	return {
		data: historyResult.data,
		error: historyResult.error,
		registrationEnabled,
		vods: vods ?? [],
	};
}
