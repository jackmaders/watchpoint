import type { z } from "zod/v4";
import type { postInsertSchema, postSelectSchema } from "./validation";

export type PostInsert = z.infer<typeof postInsertSchema>;
export type Post = z.infer<typeof postSelectSchema>;
