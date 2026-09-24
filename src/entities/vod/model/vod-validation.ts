import { createSelectSchema } from "drizzle-orm/zod";
import { z } from "zod/v4";
import { skills, vods } from "@/shared/db";

const vodCatalogSkillSchema = createSelectSchema(skills).pick({
	id: true,
	name: true,
	slug: true,
});

export const vodCatalogItemSchema = createSelectSchema(vods)
	.pick({ id: true, title: true, durationSeconds: true })
	.extend({
		questionCount: z.number().int().nonnegative(),
		skills: z.array(vodCatalogSkillSchema),
	});

export const vodCatalogSchema = z.array(vodCatalogItemSchema);
