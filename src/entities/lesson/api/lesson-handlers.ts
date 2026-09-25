import "@tanstack/react-start/server-only";

import { getDb } from "@/shared/db/index.server";
import { submitLessonAnswerHandler } from "./lesson-answer-handler";
import type {
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
	};
}
