import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";
import { z } from "zod/v4";
import { posts } from "./schema";

export const postInsertSchema = createInsertSchema(posts, {
	name: z.string().trim().min(1),
}).pick({ name: true });

export const postSelectSchema = createSelectSchema(posts);

export type PostInsert = z.infer<typeof postInsertSchema>;
