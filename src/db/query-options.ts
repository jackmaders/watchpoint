import { queryOptions } from "@tanstack/react-query";
import { getPosts } from "./queries";

export const postsQueryOptions = queryOptions({
	queryKey: ["posts"],
	queryFn: () => getPosts(),
	staleTime: 30_000,
});
