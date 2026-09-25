import "@tanstack/react-start/server-only";

import { getDb } from "@/shared/db/index.server";
import type { LessonDatabase, StartLessonHandlerInput } from "./lesson-handler-types";
import { startLessonHandler } from "./lesson-start-handler";

export function createLessonOperations(db?: LessonDatabase) {
	const getOperationsDb = () => db ?? getDb();

	return {
		lessonStartOperation: (input: StartLessonHandlerInput) =>
			startLessonHandler(getOperationsDb(), input),
	};
}
