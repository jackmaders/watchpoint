import { LessonValidationError } from "../model/lesson-errors";
import type { QuestionSnapshotInput } from "../model/lesson-types";

export function validateUniqueIds(ids: string[]) {
	const uniqueIds = [...new Set(ids)];
	if (uniqueIds.length !== ids.length) {
		throw new LessonValidationError("IDs must be unique");
	}

	return uniqueIds;
}

export function validateSnapshot({
	snapshot,
	question,
	selectedOptionId,
}: {
	snapshot: QuestionSnapshotInput;
	question: { id: string; skillId: string };
	selectedOptionId: string;
}) {
	if (
		(snapshot.questionId && snapshot.questionId !== question.id) ||
		(snapshot.skillId && snapshot.skillId !== question.skillId)
	) {
		throw new LessonValidationError(
			"The Question snapshot does not match the lesson Question",
		);
	}

	if (!snapshot.options.some((option) => option.id === selectedOptionId)) {
		throw new LessonValidationError(
			"The selected Option is not present in the Question snapshot",
		);
	}
}
