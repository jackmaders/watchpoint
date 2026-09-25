import type { z } from "zod/v4";
import type { vodCatalogItemSchema, vodCatalogSchema } from "./vod-validation";

export type VodCatalogItem = z.infer<typeof vodCatalogItemSchema>;
export type VodCatalog = z.infer<typeof vodCatalogSchema>;
