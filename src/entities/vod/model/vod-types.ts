import type { z } from "zod/v4";
import type {
	vodCatalogItemSchema,
	vodCatalogSchema,
	vodDetailSchema,
} from "./vod-validation";

export type VodCatalogItem = z.infer<typeof vodCatalogItemSchema>;
export type VodCatalog = z.infer<typeof vodCatalogSchema>;
export type VodDetail = z.infer<typeof vodDetailSchema>;
