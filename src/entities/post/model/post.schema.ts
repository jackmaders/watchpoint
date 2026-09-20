import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";
import { z } from "zod/v4";

export const posts = sqliteTable("posts", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	name: text("name").notNull(),
});

export const postInsertSchema = createInsertSchema(posts, {
	name: z.string().trim().min(1),
}).pick({ name: true });

export const postSelectSchema = createSelectSchema(posts);

export type Post = z.infer<typeof postSelectSchema>;
export type PostInsert = z.infer<typeof postInsertSchema>;
