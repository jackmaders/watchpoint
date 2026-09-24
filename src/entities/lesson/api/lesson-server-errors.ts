import { setResponseStatus } from "@tanstack/react-start/server";
import { LessonError } from "../model/lesson.errors";

export async function withLessonErrorStatus<T>(operation: () => Promise<T>) {
	try {
		return await operation();
	} catch (error) {
		if (error instanceof LessonError) {
			setResponseStatus(error.status, error.message);
		}

		throw error;
	}
}
