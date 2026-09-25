import "@tanstack/react-start/server-only";

import { getDb } from "@/shared/db/index.server";
import { submitLessonAnswerHandler } from "./lesson-answer-handler";
import { completeLessonHandler } from "./lesson-completion-handler";
import { importDemoLessonHandler } from "./lesson-demo-import-handler";
import type {
	CompleteLessonHandlerInput,
	ImportDemoLessonHandlerInput,
	LessonDatabase,
	StartLessonHandlerInput,
	SubmitLessonAnswerHandlerInput,
} from "./lesson-handler-types";
import { startLessonHandler } from "./lesson-start-handler";

export function createLessonOperations(db?: LessonDatabase) {
	const getOperationsDb = () => db ?? getDb();

	return {
		lessonStartOperation: (input: StartLessonHandlerInput) =>
			startLessonHandler(getOperationsDb(), input),
		lessonAnswerSubmitOperation: (input: SubmitLessonAnswerHandlerInput) =>
			submitLessonAnswerHandler(getOperationsDb(), input),
		lessonCompleteOperation: (input: CompleteLessonHandlerInput) =>
			completeLessonHandler(getOperationsDb(), input),
		lessonDemoImportOperation: (input: ImportDemoLessonHandlerInput) =>
			importDemoLessonHandler(getOperationsDb(), input),
	};
}
