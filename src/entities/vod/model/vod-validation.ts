import { createSelectSchema } from "drizzle-orm/zod";
import { z } from "zod/v4";
import { skills, vods } from "@/shared/db";

const vodCatalogSkillSchema = createSelectSchema(skills);

export const vodCatalogItemSchema = createSelectSchema(vods)
	.extend({
		questionCount: z.number().int().nonnegative(),
		skills: z.array(vodCatalogSkillSchema),
	})
	.refine((vod) => vod.durationSeconds > 0, {
		path: ["durationSeconds"],
		message: "Duration must be positive",
	});

export const vodCatalogSchema = z.array(vodCatalogItemSchema);
