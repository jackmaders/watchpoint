import { createServerFn } from "@tanstack/react-start";
import { getDb } from "./db.server";
import { posts } from "./schema";

export const getPosts = createServerFn().handler(async () => {
	const db = getDb();
	return db.select().from(posts);
});

export const createPost = createServerFn({ method: "POST" })
	.validator((data: { name: string }) => {
		const name = data.name.trim();
		if (!name) throw new Error("Post name is required");
		return { name };
	})
	.handler(async ({ data }) => {
		const db = getDb();
		await db.insert(posts).values(data);
		return data;
	});
