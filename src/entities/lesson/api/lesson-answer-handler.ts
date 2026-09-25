import { lessonAnswers } from "@/shared/db";
import { LessonConflictError } from "../model/lesson-errors";
import type { LessonAnswerResult } from "../model/lesson-types";
import {
	findAnswer,
	requireLessonQuestion,
	requireOwnedLesson,
	requireQuestionOption,
} from "./lesson-data";
import type {
	LessonDatabase,
	SubmitLessonAnswerHandlerInput,
} from "./lesson-handler-types";
import { validateSnapshot } from "./lesson-handler-validation";

export async function submitLessonAnswerHandler(
	db: LessonDatabase,
	{
		lessonId,
		questionId,
		selectedOptionId,
		snapshot,
		timeSpentSeconds,
		userId,
	}: SubmitLessonAnswerHandlerInput,
): Promise<LessonAnswerResult> {
	const lessonScope = await requireOwnedLesson(db, { lessonId, userId });
	const existingAnswer = await findAnswer(db, { lessonId, questionId });

	if (existingAnswer) {
		return {
			answerId: existingAnswer.id,
			isCorrect: existingAnswer.isCorrect,
			alreadySubmitted: true,
		};
	}

	if (lessonScope.lesson.status !== "in_progress") {
		throw new LessonConflictError("Lesson is no longer in progress");
	}

	const question = await requireLessonQuestion(db, {
		vodId: lessonScope.lesson.vodId,
		selectedSkillIds: lessonScope.selectedSkillIds,
		questionId,
	});
	const selectedOption = await requireQuestionOption(db, {
		questionId,
		selectedOptionId,
	});

	validateSnapshot({ snapshot, question, selectedOptionId });

	const answerId = crypto.randomUUID();
	const [insertedAnswer] = await db
		.insert(lessonAnswers)
		.values({
			id: answerId,
			lessonId,
			questionId,
			selectedOptionId,
			isCorrect: selectedOption.isCorrect,
			timeSpentSeconds,
			questionSnapshot: snapshot,
		})
		.onConflictDoNothing({
			target: [lessonAnswers.lessonId, lessonAnswers.questionId],
		})
		.returning({
			id: lessonAnswers.id,
			isCorrect: lessonAnswers.isCorrect,
		});

	if (insertedAnswer) {
		return {
			answerId: insertedAnswer.id,
			isCorrect: insertedAnswer.isCorrect,
			alreadySubmitted: false,
		};
	}

	const concurrentAnswer = await findAnswer(db, { lessonId, questionId });
	if (!concurrentAnswer) {
		throw new LessonConflictError("Answer was already submitted");
	}

	return {
		answerId: concurrentAnswer.id,
		isCorrect: concurrentAnswer.isCorrect,
		alreadySubmitted: true,
	};
}
