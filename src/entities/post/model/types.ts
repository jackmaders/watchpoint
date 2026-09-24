import type { z } from "zod/v4";
import type { postInsertSchema, postSelectSchema } from "./validation";

export type PostInsertSchema = z.infer<typeof postInsertSchema>;
export type PostSelectSchema = z.infer<typeof postSelectSchema>;
