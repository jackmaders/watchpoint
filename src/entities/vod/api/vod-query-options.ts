import { queryOptions } from "@tanstack/react-query";
import { publishedVodListServerFn } from "./vod.functions";

const publishedVodListQueryKey = ["vods", "published"] as const;

export const publishedVodListQueryOptions = queryOptions({
	queryKey: publishedVodListQueryKey,
	queryFn: () => publishedVodListServerFn(),
	staleTime: 30_000,
});
