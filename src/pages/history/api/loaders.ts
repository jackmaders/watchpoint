/**
 * Data loader and query options for the training match history page and search filter state.
 *
 * Implements `historyQueryOptions`, `loadPlayerHistory`, and `loadHistoryIndexPage` to concurrently fetch
 * published VODs, registration configuration, and paginated match history records using `queryKeys.history`.
 */

import type { QueryClient } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { getPublishedVods } from "@/entities/vod";
import { queryKeys } from "@/shared/api";
import { isRegistrationOpen } from "@/shared/lib/auth";
import type { HistorySearchParams } from "../model/search-params";
import { getPlayerHistory } from "./server-fns";

export const historyQueryOptions = (deps?: HistorySearchParams) =>
	queryOptions({
		queryFn: () =>
			getPlayerHistory({
				data: {
					modules: deps?.modules ? [...deps.modules] : undefined,
					page: deps?.page,
					pageSize: deps?.pageSize,
					status: deps?.status,
					vodId: deps?.vodId,
				},
			}),
		queryKey:
			deps && Object.keys(deps).length > 0
				? ([...queryKeys.history, deps] as const)
				: queryKeys.history,
	});

export async function loadPlayerHistory(deps?: HistorySearchParams) {
	const historyResult = await getPlayerHistory({
		data: {
			modules: deps?.modules ? [...deps.modules] : undefined,
			page: deps?.page,
			pageSize: deps?.pageSize,
			status: deps?.status,
			vodId: deps?.vodId,
		},
	});

	return {
		data: historyResult.status === "success" ? historyResult.data : undefined,
		error: historyResult.status === "rejected" ? historyResult.reason : null,
	};
}

export async function loadHistoryIndexPage({
	context,
	deps,
}: {
	context?: { queryClient: QueryClient };
	deps: HistorySearchParams;
}) {
	if (context?.queryClient) {
		await context.queryClient.query({
			...historyQueryOptions(deps),
			staleTime: "static",
		});
	}

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
