import {
	queryOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";
import { z } from "zod/v4";
import { getDb } from "@/db/db.server";
import { posts } from "@/db/schema";
import { ensureSession } from "@/lib/auth.functions";

const postInsertSchema = createInsertSchema(posts, {
	name: z.string().trim().min(1),
}).pick({ name: true });

const postSelectSchema = createSelectSchema(posts);

export type PostInsert = z.infer<typeof postInsertSchema>;

export const getPosts = createServerFn().handler(async () => {
	const db = getDb();
	const result = await db.select().from(posts);
	return postSelectSchema.array().parse(result);
});

export const createPost = createServerFn({ method: "POST" })
	.validator(postInsertSchema)
	.handler(async ({ data }) => {
		await ensureSession();
		const db = getDb();
		const [post] = await db.insert(posts).values(data).returning();
		return postSelectSchema.parse(post);
	});

export const postsQueryOptions = queryOptions({
	queryKey: ["posts"],
	queryFn: () => getPosts(),
	staleTime: 30_000,
});

export function useCreatePostMutation() {
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
