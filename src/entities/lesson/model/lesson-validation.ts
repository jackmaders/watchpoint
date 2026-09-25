import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";
import { z } from "zod/v4";
import {
	lessonAnswers,
	lessonSelectedSkills,
	lessons,
	options,
	questions,
} from "@/shared/db";

export const lessonSelectSchema = createSelectSchema(lessons);
export const lessonSelectedSkillsInsertSchema =
	createInsertSchema(lessonSelectedSkills);
export const lessonAnswerInsertSchema = createInsertSchema(lessonAnswers);

const questionSelectSchema = createSelectSchema(questions);
const optionSelectSchema = createSelectSchema(options);

export const questionSnapshotOptionSchema = z.object({
	id: optionSelectSchema.shape.id,
	isCorrect: optionSelectSchema.shape.isCorrect.optional(),
	orderIndex: optionSelectSchema.shape.orderIndex,
	text: optionSelectSchema.shape.text,
});

export const questionSnapshotSchema = z.object({
	explanation: z.string().nullable().optional(),
	options: z.array(questionSnapshotOptionSchema).min(2),
	questionId: questionSelectSchema.shape.id.optional(),
	prompt: questionSelectSchema.shape.prompt,
	skillId: questionSelectSchema.shape.skillId.optional(),
	skillName: z.string().trim().min(1).optional(),
	timestampSeconds: questionSelectSchema.shape.timestampSeconds,
});

export const lessonAnswerInputSchema = z.object({
	questionId: lessonAnswerInsertSchema.shape.questionId,
	selectedOptionId: lessonAnswerInsertSchema.shape.selectedOptionId,
	snapshot: questionSnapshotSchema,
	timeSpentSeconds: lessonAnswerInsertSchema.shape.timeSpentSeconds
		.unwrap()
		.unwrap()
		.nonnegative()
		.optional(),
});

export const submitLessonAnswerSchema = lessonAnswerInputSchema.extend({
	lessonId: lessonAnswerInsertSchema.shape.lessonId,
});

export const lessonAnswerResultSchema = z.object({
	answerId: lessonAnswerInsertSchema.shape.id,
	isCorrect: lessonAnswerInsertSchema.shape.isCorrect,
	alreadySubmitted: z.boolean(),
});

export const lessonCompletionSchema = z.object({
	lessonId: lessonSelectSchema.shape.id,
});

export const lessonCompletionSummarySchema = z.object({
	lessonId: lessonSelectSchema.shape.id,
	score: z.number().int().nonnegative(),
	totalQuestions: z.number().int().nonnegative(),
	completedAt: z.date(),
});

export const startLessonSchema = z.object({
	vodId: lessonSelectSchema.shape.vodId,
	selectedSkillIds: z
		.array(lessonSelectedSkillsInsertSchema.shape.skillId)
		.min(1)
		.max(50),
});
