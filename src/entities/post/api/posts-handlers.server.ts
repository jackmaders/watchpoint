import "@tanstack/react-start/server-only";

import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";
import { z } from "zod/v4";
import { getDb, posts } from "@/shared/db/index.server";

export const postSelectSchema = createSelectSchema(posts);

export const postInsertSchema = createInsertSchema(posts);
type PostInsertSchema = z.infer<typeof postInsertSchema>;

export async function postListHandler() {
	const db = getDb();
	const result = await db.select().from(posts);
	return postSelectSchema.array().parse(result);
}

export async function postCreateHandler(data: PostInsertSchema) {
	const db = getDb();
	const input = postInsertSchema.parse(data);
	const [post] = await db.insert(posts).values(input).returning();
	return postSelectSchema.parse(post);
}
