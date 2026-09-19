import { createServerFn } from "@tanstack/react-start";
import { getDb } from "./db.server";
import { posts } from "./schema";
import { postInsertSchema, postSelectSchema } from "./validation";

export const getPosts = createServerFn().handler(async () => {
	const db = getDb();
	const result = await db.select().from(posts);
	return postSelectSchema.array().parse(result);
});

export const createPost = createServerFn({ method: "POST" })
	.validator(postInsertSchema)
	.handler(async ({ data }) => {
		const db = getDb();
		const [post] = await db.insert(posts).values(data).returning();
		return postSelectSchema.parse(post);
	});
