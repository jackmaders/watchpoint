import type { getDb } from "@/shared/db/index.server";
import type {
	CompleteLessonInput,
	ImportDemoLessonInput,
	LessonAnswerInput,
	StartLessonInput,
} from "../model/lesson-types";

export type LessonDatabase = ReturnType<typeof getDb>;

export type StartLessonHandlerInput = StartLessonInput & { userId: string };
export type SubmitLessonAnswerHandlerInput = LessonAnswerInput & {
	lessonId: string;
	userId: string;
};
export type CompleteLessonHandlerInput = CompleteLessonInput & {
	userId: string;
};
export type ImportDemoLessonHandlerInput = ImportDemoLessonInput & {
	userId: string;
};
