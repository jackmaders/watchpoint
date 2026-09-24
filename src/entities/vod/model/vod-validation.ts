import { z } from "zod/v4";

export const vodCatalogItemSchema = z.object({
	id: z.string(),
	title: z.string(),
	durationSeconds: z.number().int().positive(),
	questionCount: z.number().int().nonnegative(),
	skills: z.array(
		z.object({
			id: z.string(),
			name: z.string(),
			slug: z.string(),
		}),
	),
});

export const vodCatalogSchema = z.array(vodCatalogItemSchema);
