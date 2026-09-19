import { createServerFn } from "@tanstack/react-start";
import { getDb } from "./db.server";
import { posts } from "./schema";

export const getPosts = createServerFn().handler(async () => {
	const db = getDb();
	return db.select().from(posts);
});
