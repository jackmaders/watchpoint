import { getDb, posts } from "@/shared/db";
import {
	type PostInsert,
	postInsertSchema,
	postSchema,
} from "../model/post.schema";

export async function getPostsRecord() {
	const db = getDb();
	const result = await db.select().from(posts);
	return postSchema.array().parse(result);
}

export async function createPostRecord(data: PostInsert) {
	const db = getDb();
	const input = postInsertSchema.parse(data);
	const [post] = await db.insert(posts).values(input).returning();
	return postSchema.parse(post);
}
