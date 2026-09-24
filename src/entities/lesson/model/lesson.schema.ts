import { z } from "zod/v4";

const idSchema = z.string().trim().min(1);

export const questionSnapshotOptionSchema = z.object({
	id: idSchema,
	isCorrect: z.boolean().optional(),
	orderIndex: z.number().int().nonnegative(),
	text: z.string().min(1),
});

export const questionSnapshotSchema = z.object({
	explanation: z.string().nullable().optional(),
	options: z.array(questionSnapshotOptionSchema).min(2),
	questionId: idSchema.optional(),
	prompt: z.string().min(1),
	skillId: idSchema.optional(),
	skillName: z.string().trim().min(1).optional(),
	timestampSeconds: z.number().int().nonnegative(),
});

const lessonAnswerInputSchema = z.object({
	questionId: idSchema,
	selectedOptionId: idSchema,
	snapshot: questionSnapshotSchema,
	timeSpentSeconds: z.number().int().nonnegative().optional(),
});

export const startLessonSchema = z.object({
	vodId: idSchema,
	selectedSkillIds: z.array(idSchema).min(1).max(50),
});

export const submitLessonAnswerSchema = lessonAnswerInputSchema.extend({
	lessonId: idSchema,
});

export const importDemoLessonSchema = startLessonSchema.extend({
	answers: z.array(lessonAnswerInputSchema),
});

export const lessonCompletionSchema = z.object({
	lessonId: idSchema,
});

export const lessonCompletionSummarySchema = z.object({
	lessonId: idSchema,
	score: z.number().int().nonnegative(),
	totalQuestions: z.number().int().nonnegative(),
	completedAt: z.date(),
});

export const lessonAnswerResultSchema = z.object({
	answerId: idSchema,
	isCorrect: z.boolean(),
	alreadySubmitted: z.boolean(),
});

export type LessonAnswerInput = z.infer<typeof lessonAnswerInputSchema>;
export type ImportDemoLessonInput = z.infer<typeof importDemoLessonSchema>;
export type LessonAnswerResult = z.infer<typeof lessonAnswerResultSchema>;
export type LessonCompletionSummary = z.infer<
	typeof lessonCompletionSummarySchema
>;
export type QuestionSnapshotInput = z.infer<typeof questionSnapshotSchema>;
