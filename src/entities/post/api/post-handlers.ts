import { posts } from "@/shared/db";
import { getDb } from "@/shared/db/index.server";
import { postSelectSchema } from "../model/post-validation";

export async function postListHandler(db = getDb()) {
	const result = await db.select().from(posts);
	return postSelectSchema.array().parse(result);
}
