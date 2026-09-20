import { z } from "zod/v4";

export const postInsertSchema = z.object({
	name: z.string().trim().min(1),
});

export const postSchema = z.object({
	id: z.number().int(),
	name: z.string(),
});

export type Post = z.infer<typeof postSchema>;
export type PostInsert = z.infer<typeof postInsertSchema>;
