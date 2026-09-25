import { createSelectSchema } from "drizzle-orm/zod";
import { z } from "zod/v4";
import { skills, vods } from "@/shared/db";

export const vodCatalogColumns = {
	id: true,
	title: true,
	durationSeconds: true,
} as const;

export const vodCatalogSkillColumns = {
	id: true,
	name: true,
	slug: true,
} as const;

const vodCatalogSkillSchema = createSelectSchema(skills).pick(
	vodCatalogSkillColumns,
);

export const vodCatalogItemSchema = createSelectSchema(vods)
	.pick(vodCatalogColumns)
	.extend({
		questionCount: z.number().int().nonnegative(),
		skills: z.array(vodCatalogSkillSchema),
	});

export const vodCatalogSchema = z.array(vodCatalogItemSchema);
