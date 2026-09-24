import "@tanstack/react-start/server-only";

import { posts } from "@/shared/db";
import { getDb } from "@/shared/db/index.server";
import type { PostInsertSchema } from "../model/types";
import { postInsertSchema, postSelectSchema } from "../model/validation";

export async function postListHandler(db = getDb()) {
	const result = await db.select().from(posts);
	return postSelectSchema.array().parse(result);
}

export async function postCreateHandler(data: PostInsertSchema, db = getDb()) {
	const input = postInsertSchema.parse(data);
	const [post] = await db.insert(posts).values(input).returning();
	return postSelectSchema.parse(post);
}
