import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";
import { posts } from "@/shared/db";

export const postSelectSchema = createSelectSchema(posts);
export const postInsertSchema = createInsertSchema(posts);
