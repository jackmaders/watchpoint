import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { type PostInsert, postsQueryOptions } from "@/entities/post";
import { createPost } from "./post-create.functions";

export function usePostCreateMutation() {
	const queryClient = useQueryClient();
	const createPostFn = useServerFn(createPost);

	return useMutation({
		mutationFn: (data: PostInsert) => createPostFn({ data }),
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: postsQueryOptions.queryKey,
			}),
	});
}
