import "@tanstack/react-start/server-only";

import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";
import { z } from "zod/v4";
import { getDb, posts } from "@/shared/db/index.server";

const selectSchema = createSelectSchema(posts);
const insertSchema = createInsertSchema(posts);

export async function postListHandler() {
	const db = getDb();
	const result = await db.select().from(posts);
	return selectSchema.array().parse(result);
}

export async function postCreateHandler(data: z.infer<typeof insertSchema>) {
	const db = getDb();
	const input = insertSchema.parse(data);
	const [post] = await db.insert(posts).values(input).returning();
	return selectSchema.parse(post);
}
