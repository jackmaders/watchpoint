import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";
import { z } from "zod/v4";
import { lessonSelectedSkills, lessons } from "@/shared/db";

export const lessonSelectSchema = createSelectSchema(lessons);
export const lessonSelectedSkillsInsertSchema =
	createInsertSchema(lessonSelectedSkills);

export const startLessonSchema = z.object({
	vodId: lessonSelectSchema.shape.vodId,
	selectedSkillIds: z
		.array(lessonSelectedSkillsInsertSchema.shape.skillId)
		.min(1)
		.max(50),
});
