import { and, eq } from "drizzle-orm";
import { lessonAnswers, lessons } from "@/shared/db";
import {
	LessonConflictError,
	LessonValidationError,
} from "../model/lesson-errors";
import type { LessonCompletionSummary } from "../model/lesson-types";
import { findLessonQuestions, requireOwnedLesson } from "./lesson-data";
import type {
	CompleteLessonHandlerInput,
	LessonDatabase,
} from "./lesson-handler-types";

export async function completeLessonHandler(
	db: LessonDatabase,
	{ userId, lessonId }: CompleteLessonHandlerInput,
): Promise<LessonCompletionSummary> {
	const lessonScope = await requireOwnedLesson(db, { lessonId, userId });
	if (lessonScope.lesson.status === "abandoned") {
		throw new LessonConflictError("Lesson cannot be completed");
	}

	const answers = await db
		.select({
			questionId: lessonAnswers.questionId,
			isCorrect: lessonAnswers.isCorrect,
		})
		.from(lessonAnswers)
		.where(eq(lessonAnswers.lessonId, lessonId));

	if (lessonScope.lesson.status === "completed") {
		if (!lessonScope.lesson.completedAt) {
			throw new LessonConflictError(
				"Completed Lesson is missing its completion time",
			);
		}

		return buildCompletionSummary({
			lessonId,
			answers,
			expectedQuestionIds: new Set(answers.map((answer) => answer.questionId)),
			completedAt: lessonScope.lesson.completedAt,
		});
	}

	const expectedQuestions = await findLessonQuestions(db, {
		vodId: lessonScope.lesson.vodId,
		selectedSkillIds: lessonScope.selectedSkillIds,
	});

	const expectedQuestionIds = new Set(
		expectedQuestions.map((question) => question.id),
	);
	const answeredQuestionIds = new Set(
		answers
			.filter((answer) => expectedQuestionIds.has(answer.questionId))
			.map((answer) => answer.questionId),
	);

	if (answeredQuestionIds.size !== expectedQuestionIds.size) {
		throw new LessonValidationError(
			"Every Question in the selected Skills must be answered before completion",
		);
	}

	const completedAt = new Date();
	const [completedLesson] = await db
		.update(lessons)
		.set({ status: "completed", completedAt, updatedAt: completedAt })
		.where(
			and(
				eq(lessons.id, lessonId),
				eq(lessons.userId, userId),
				eq(lessons.status, "in_progress"),
			),
		)
		.returning({ completedAt: lessons.completedAt });

	if (!completedLesson?.completedAt) {
		throw new LessonConflictError(
			"Lesson completion conflicted with another update",
		);
	}

	return buildCompletionSummary({
		lessonId,
		answers,
		expectedQuestionIds,
		completedAt: completedLesson.completedAt,
	});
}

function buildCompletionSummary({
	lessonId,
	answers,
	expectedQuestionIds,
	completedAt,
}: {
	lessonId: string;
	answers: Array<{ questionId: string; isCorrect: boolean }>;
	expectedQuestionIds: Set<string>;
	completedAt: Date;
}): LessonCompletionSummary {
	return {
		lessonId,
		score: answers.filter(
			(answer) =>
				expectedQuestionIds.has(answer.questionId) && answer.isCorrect,
		).length,
		totalQuestions: expectedQuestionIds.size,
		completedAt,
	};
}
