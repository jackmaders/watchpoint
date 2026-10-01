import { z } from "zod/v4";

export const questionSnapshotOptionSchema = z.object({
	id: z.string().min(1),
	orderIndex: z.number().int().nonnegative(),
	text: z.string().min(1),
});

export const questionSnapshotSchema = z.object({
	options: z.array(questionSnapshotOptionSchema),
	prompt: z.string().min(1),
	timestampSeconds: z.number().int().nonnegative(),
});

export const startLessonInputSchema = z.object({
	vodId: z.string().min(1),
	selectedSkillIds: z.array(z.string().min(1)).default([]),
});

export const submitLessonAnswerInputSchema = z.object({
	lessonId: z.string().min(1),
	questionId: z.string().min(1),
	selectedOptionId: z.string().min(1),
	snapshot: questionSnapshotSchema,
	timeSpentSeconds: z.number().int().nonnegative().optional(),
});

export const completeLessonInputSchema = z.object({
	lessonId: z.string().min(1),
});

export const userIdSchema = z.string().min(1);

export type StartLessonInput = z.infer<typeof startLessonInputSchema>;
export type SubmitLessonAnswerInput = z.infer<
	typeof submitLessonAnswerInputSchema
>;
export type CompleteLessonInput = z.infer<typeof completeLessonInputSchema>;
