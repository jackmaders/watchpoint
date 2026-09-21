import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useState } from "react";
import type { PostInsert } from "@/entities/post";
import { postCreateServerFn } from "./post-create.functions";

export function usePostCreateMutation() {
	const router = useRouter();
	const postCreate = useServerFn(postCreateServerFn);
	const [isPending, setIsPending] = useState(false);
	const mutateAsync = useCallback(
		async (data: PostInsert) => {
			setIsPending(true);
			try {
				const result = await postCreate({ data });
				await router.invalidate();
				return result;
			} finally {
				setIsPending(false);
			}
		},
		[postCreate, router],
	);

	return { isPending, mutateAsync };
}
