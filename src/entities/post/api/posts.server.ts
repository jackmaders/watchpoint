import "@tanstack/react-start/server-only";

import { getDb, posts } from "@/shared/db/index.server";
import {
	type PostInsert,
	postInsertSchema,
	postSchema,
} from "../model/post.schema";

export async function postListOperation() {
	const db = getDb();
	const result = await db.select().from(posts);
	return postSchema.array().parse(result);
}

export async function postCreateOperation(data: PostInsert) {
	const db = getDb();
	const input = postInsertSchema.parse(data);
	const [post] = await db.insert(posts).values(input).returning();
	return postSchema.parse(post);
}
