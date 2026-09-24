import { type PostInsert, postInsertSchema } from "@/entities/post";
import { postSelectSchema } from "@/entities/post/model/post-validation";
import { posts } from "@/shared/db";
import { getDb } from "@/shared/db/index.server";

export async function postCreateHandler(data: PostInsert, db = getDb()) {
	const input = postInsertSchema.parse(data);
	const [post] = await db.insert(posts).values(input).returning();
	return postSelectSchema.parse(post);
}
