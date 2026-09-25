import type { z } from "zod/v4";
import type {
	lessonAnswerInputSchema,
	lessonAnswerResultSchema,
	questionSnapshotSchema,
	startLessonSchema,
} from "./lesson-validation";

export type StartLessonInput = z.infer<typeof startLessonSchema>;
export type LessonAnswerInput = z.infer<typeof lessonAnswerInputSchema>;
export type LessonAnswerResult = z.infer<typeof lessonAnswerResultSchema>;
export type QuestionSnapshotInput = z.infer<typeof questionSnapshotSchema>;
