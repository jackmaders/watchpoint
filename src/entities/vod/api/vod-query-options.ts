import { queryOptions } from "@tanstack/react-query";
import { publishedVodListServerFn } from "./vod.functions";

export const publishedVodListQueryOptions = queryOptions({
	queryKey: ["vods", "published"],
	queryFn: () => publishedVodListServerFn(),
	staleTime: 30_000,
});
