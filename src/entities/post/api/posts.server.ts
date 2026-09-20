import { getDb } from "@/shared/db";
import { type PostInsert, postSelectSchema, posts } from "../model/post.schema";

export async function getPostsRecord() {
	const db = getDb();
	const result = await db.select().from(posts);
	return postSelectSchema.array().parse(result);
}

export async function createPostRecord(data: PostInsert) {
	const db = getDb();
	const [post] = await db.insert(posts).values(data).returning();
	return postSelectSchema.parse(post);
}
