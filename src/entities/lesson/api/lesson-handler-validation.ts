import { LessonValidationError } from "../model/lesson-errors";

export function validateUniqueIds(ids: string[]) {
	const uniqueIds = [...new Set(ids)];
	if (uniqueIds.length !== ids.length) {
		throw new LessonValidationError("IDs must be unique");
	}

	return uniqueIds;
}
