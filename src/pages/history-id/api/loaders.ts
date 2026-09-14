/**
 * Data loader and query options for retrieving individual playthrough performance history details.
 *
 * Implements `historyDetailQueryOptions` and `loadHistoryIdPage` using `queryKeys.historyDetail`
 * to pre-warm and retrieve playthrough attempt telemetry without throwing exceptions.
 */

import type { QueryClient } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api";
import { getPlaythroughHistoryDetail } from "./server-fns";

export const historyDetailQueryOptions = (id: string) =>
	queryOptions({
		queryFn: () => getPlaythroughHistoryDetail({ data: { id } }),
		queryKey: [...queryKeys.historyDetail, id] as const,
	});

export async function loadHistoryIdPage({
	context,
	params,
}: {
	context?: { queryClient: QueryClient };
	params: { id: string };
}) {
	if (context?.queryClient) {
		await context.queryClient.query({
			...historyDetailQueryOptions(params.id),
			staleTime: "static",
		});
	}

	const result = (await getPlaythroughHistoryDetail({
		data: { id: params.id },
	})) as unknown as import("../model/types").GetHistoryDetailResult;

	return {
		error: result.status === "rejected" ? result.reason : null,
		playthrough: result.status === "success" ? result.data : null,
	};
}
