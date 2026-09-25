import { createSelectSchema } from "drizzle-orm/zod";
import { z } from "zod/v4";
import { skillSelectSchema } from "@/entities/skill/@x/vod";
import { vods } from "@/shared/db";

export const vodCatalogItemSchema = createSelectSchema(vods)
	.extend({
		questionCount: z.number().int().nonnegative(),
		skills: z.array(skillSelectSchema),
	})
	.refine((vod) => vod.durationSeconds > 0, {
		path: ["durationSeconds"],
		message: "Duration must be positive",
	});

export const vodCatalogSchema = z.array(vodCatalogItemSchema);
