import { queryOptions } from "@tanstack/react-query";
import { postListServerFn } from "./posts.functions";

export const postListQueryOptions = queryOptions({
	queryKey: ["posts"],
	queryFn: () => postListServerFn(),
	staleTime: 30_000,
});
