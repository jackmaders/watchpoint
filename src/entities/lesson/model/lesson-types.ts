import type { z } from "zod/v4";
import type {
	importDemoLessonSchema,
	lessonAnswerInputSchema,
	lessonAnswerResultSchema,
	lessonCompletionSchema,
	lessonCompletionSummarySchema,
	questionSnapshotSchema,
	startLessonSchema,
} from "./lesson-validation";

export type StartLessonInput = z.infer<typeof startLessonSchema>;
export type LessonAnswerInput = z.infer<typeof lessonAnswerInputSchema>;
export type LessonAnswerResult = z.infer<typeof lessonAnswerResultSchema>;
export type ImportDemoLessonInput = z.infer<typeof importDemoLessonSchema>;
export type CompleteLessonInput = z.infer<typeof lessonCompletionSchema>;
export type LessonCompletionSummary = z.infer<
	typeof lessonCompletionSummarySchema
>;
export type QuestionSnapshotInput = z.infer<typeof questionSnapshotSchema>;
