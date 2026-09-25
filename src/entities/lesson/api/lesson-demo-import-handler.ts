import { lessonAnswers, lessonSelectedSkills, lessons } from "@/shared/db";
import { LessonValidationError } from "../model/lesson-errors";
import type { LessonCompletionSummary } from "../model/lesson-types";
import {
	findLessonQuestions,
	requireLessonQuestion,
	requireQuestionOption,
	requireSkills,
	requireVod,
} from "./lesson-data";
import type {
	ImportDemoLessonHandlerInput,
	LessonDatabase,
} from "./lesson-handler-types";
import {
	validateSnapshot,
	validateUniqueIds,
} from "./lesson-handler-validation";

export async function importDemoLessonHandler(
	db: LessonDatabase,
	{ userId, vodId, selectedSkillIds, answers }: ImportDemoLessonHandlerInput,
): Promise<LessonCompletionSummary> {
	const normalizedSkillIds = validateUniqueIds(selectedSkillIds);
	const vod = await requireVod(db, vodId);
	if (!vod.isDemo) {
		throw new LessonValidationError("Only the demo VOD can be imported");
	}
	await requireSkills(db, normalizedSkillIds);

	const questionIds = validateUniqueIds(
		answers.map((answer) => answer.questionId),
	);
	const expectedQuestions = await findLessonQuestions(db, {
		vodId,
		selectedSkillIds: normalizedSkillIds,
	});
	const expectedQuestionIds = new Set(
		expectedQuestions.map((question) => question.id),
	);

	if (
		questionIds.length !== expectedQuestionIds.size ||
		questionIds.some((questionId) => !expectedQuestionIds.has(questionId))
	) {
		throw new LessonValidationError(
			"The demo Lesson must include exactly one Answer for every Question in the selected Skills",
		);
	}

	const answerRows = await Promise.all(
		answers.map(async (answer) => {
			const question = await requireLessonQuestion(db, {
				vodId,
				selectedSkillIds: normalizedSkillIds,
				questionId: answer.questionId,
			});
			const selectedOption = await requireQuestionOption(db, {
				questionId: answer.questionId,
				selectedOptionId: answer.selectedOptionId,
			});

			validateSnapshot({
				snapshot: answer.snapshot,
				question,
				selectedOptionId: answer.selectedOptionId,
			});

			return {
				id: crypto.randomUUID(),
				question,
				selectedOption,
				answer,
			};
		}),
	);

	const lessonId = crypto.randomUUID();
	const completedAt = new Date();
	await db.batch([
		db.insert(lessons).values({
			id: lessonId,
			userId,
			vodId,
			status: "completed",
			completedAt,
			createdAt: completedAt,
			updatedAt: completedAt,
		}),
		...normalizedSkillIds.map((skillId) =>
			db.insert(lessonSelectedSkills).values({ lessonId, skillId }),
		),
		...answerRows.map(({ id, question, selectedOption, answer }) =>
			db.insert(lessonAnswers).values({
				id,
				lessonId,
				questionId: question.id,
				selectedOptionId: answer.selectedOptionId,
				isCorrect: selectedOption.isCorrect,
				timeSpentSeconds: answer.timeSpentSeconds,
				questionSnapshot: answer.snapshot,
			}),
		),
	]);

	return {
		lessonId,
		score: answerRows.filter(({ selectedOption }) => selectedOption.isCorrect)
			.length,
		totalQuestions: expectedQuestionIds.size,
		completedAt,
	};
}
