import "@tanstack/react-start/server-only";

import { and, eq, inArray } from "drizzle-orm";
import {
	lessonAnswers,
	lessonSelectedSkills,
	lessons,
	options,
	questions,
	skills,
	vods,
} from "@/shared/db";
import { getDb } from "@/shared/db/index.server";
import {
	LessonConflictError,
	LessonNotFoundError,
	LessonValidationError,
} from "../model/lesson.errors";
import type {
	ImportDemoLessonInput,
	LessonAnswerInput,
	LessonAnswerResult,
	LessonCompletionSummary,
	QuestionSnapshotInput,
} from "../model/lesson.schema";

type LessonDatabase = ReturnType<typeof getDb>;

export function createLessonOperations(db?: LessonDatabase) {
	const getOperationsDb = () => db ?? getDb();

	return {
		lessonStartOperation: (input: StartLessonOperationInput) =>
			startLesson(getOperationsDb(), input),
		lessonAnswerSubmitOperation: (input: SubmitLessonAnswerOperationInput) =>
			submitLessonAnswer(getOperationsDb(), input),
		lessonCompleteOperation: (input: CompleteLessonOperationInput) =>
			completeLesson(getOperationsDb(), input),
		lessonDemoImportOperation: (input: ImportDemoLessonOperationInput) =>
			importDemoLesson(getOperationsDb(), input),
	};
}

export const lessonStartOperation = (input: StartLessonOperationInput) =>
	startLesson(getDb(), input);

export const lessonAnswerSubmitOperation = (
	input: SubmitLessonAnswerOperationInput,
) => submitLessonAnswer(getDb(), input);

export const lessonCompleteOperation = (input: CompleteLessonOperationInput) =>
	completeLesson(getDb(), input);

export const lessonDemoImportOperation = (
	input: ImportDemoLessonOperationInput,
) => importDemoLesson(getDb(), input);

interface StartLessonOperationInput {
	selectedSkillIds: string[];
	userId: string;
	vodId: string;
}

interface SubmitLessonAnswerOperationInput extends LessonAnswerInput {
	lessonId: string;
	userId: string;
}

interface CompleteLessonOperationInput {
	lessonId: string;
	userId: string;
}

interface ImportDemoLessonOperationInput extends ImportDemoLessonInput {
	userId: string;
}

async function startLesson(
	db: LessonDatabase,
	{ userId, vodId, selectedSkillIds }: StartLessonOperationInput,
) {
	const normalizedSkillIds = validateUniqueIds(selectedSkillIds);
	await requireVod(db, vodId);
	await requireSkills(db, normalizedSkillIds);

	const lessonId = crypto.randomUUID();
	const now = new Date();

	await db.batch([
		db.insert(lessons).values({
			id: lessonId,
			userId,
			vodId,
			status: "in_progress",
			createdAt: now,
			updatedAt: now,
		}),
		...normalizedSkillIds.map((skillId) =>
			db.insert(lessonSelectedSkills).values({ lessonId, skillId }),
		),
	]);

	return { lessonId };
}

async function submitLessonAnswer(
	db: LessonDatabase,
	{
		lessonId,
		questionId,
		selectedOptionId,
		snapshot,
		timeSpentSeconds,
		userId,
	}: SubmitLessonAnswerOperationInput,
): Promise<LessonAnswerResult> {
	const lessonScope = await requireOwnedLesson(db, lessonId, userId);
	const existingAnswer = await findAnswer(db, lessonId, questionId);

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

	const question = await requireLessonQuestion(
		db,
		lessonScope.lesson.vodId,
		lessonScope.selectedSkillIds,
		questionId,
	);
	const selectedOption = await requireQuestionOption(
		db,
		questionId,
		selectedOptionId,
	);

	validateSnapshot(snapshot, question, selectedOptionId);

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

	const concurrentAnswer = await findAnswer(db, lessonId, questionId);
	if (!concurrentAnswer) {
		throw new LessonConflictError("Answer was already submitted");
	}

	return {
		answerId: concurrentAnswer.id,
		isCorrect: concurrentAnswer.isCorrect,
		alreadySubmitted: true,
	};
}

async function completeLesson(
	db: LessonDatabase,
	{ userId, lessonId }: CompleteLessonOperationInput,
): Promise<LessonCompletionSummary> {
	const lessonScope = await requireOwnedLesson(db, lessonId, userId);
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

	const expectedQuestions = await findLessonQuestions(
		db,
		lessonScope.lesson.vodId,
		lessonScope.selectedSkillIds,
	);

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

async function importDemoLesson(
	db: LessonDatabase,
	{ userId, vodId, selectedSkillIds, answers }: ImportDemoLessonOperationInput,
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
	const expectedQuestions = await findLessonQuestions(
		db,
		vodId,
		normalizedSkillIds,
	);
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
			const question = await requireLessonQuestion(
				db,
				vodId,
				normalizedSkillIds,
				answer.questionId,
			);
			const selectedOption = await requireQuestionOption(
				db,
				answer.questionId,
				answer.selectedOptionId,
			);

			validateSnapshot(answer.snapshot, question, answer.selectedOptionId);

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

async function requireVod(db: LessonDatabase, vodId: string) {
	const [vod] = await db
		.select({ id: vods.id, isDemo: vods.isDemo })
		.from(vods)
		.where(eq(vods.id, vodId))
		.limit(1);

	if (!vod) {
		throw new LessonNotFoundError("VOD");
	}

	return vod;
}

async function requireSkills(db: LessonDatabase, skillIds: string[]) {
	const existingSkills = await db
		.select({ id: skills.id })
		.from(skills)
		.where(inArray(skills.id, skillIds));

	if (existingSkills.length !== skillIds.length) {
		throw new LessonNotFoundError("One or more Skills");
	}
}

async function requireOwnedLesson(
	db: LessonDatabase,
	lessonId: string,
	userId: string,
) {
	const [lesson] = await db
		.select()
		.from(lessons)
		.where(and(eq(lessons.id, lessonId), eq(lessons.userId, userId)))
		.limit(1);

	if (!lesson) {
		throw new LessonNotFoundError("Lesson");
	}

	const selectedSkills = await db
		.select({ skillId: lessonSelectedSkills.skillId })
		.from(lessonSelectedSkills)
		.where(eq(lessonSelectedSkills.lessonId, lessonId));

	return {
		lesson,
		selectedSkillIds: selectedSkills.map(({ skillId }) => skillId),
	};
}

async function findLessonQuestions(
	db: LessonDatabase,
	vodId: string,
	selectedSkillIds: string[],
) {
	return db
		.select({ id: questions.id, skillId: questions.skillId })
		.from(questions)
		.where(
			and(
				eq(questions.vodId, vodId),
				inArray(questions.skillId, selectedSkillIds),
			),
		);
}

async function requireLessonQuestion(
	db: LessonDatabase,
	vodId: string,
	selectedSkillIds: string[],
	questionId: string,
) {
	const [question] = await db
		.select({
			id: questions.id,
			vodId: questions.vodId,
			skillId: questions.skillId,
			timestampSeconds: questions.timestampSeconds,
		})
		.from(questions)
		.where(
			and(
				eq(questions.id, questionId),
				eq(questions.vodId, vodId),
				inArray(questions.skillId, selectedSkillIds),
			),
		)
		.limit(1);

	if (!question) {
		throw new LessonNotFoundError("Question");
	}

	return question;
}

async function requireQuestionOption(
	db: LessonDatabase,
	questionId: string,
	selectedOptionId: string,
) {
	const [selectedOption] = await db
		.select({
			id: options.id,
			questionId: options.questionId,
			isCorrect: options.isCorrect,
		})
		.from(options)
		.where(
			and(eq(options.id, selectedOptionId), eq(options.questionId, questionId)),
		)
		.limit(1);

	if (!selectedOption) {
		throw new LessonNotFoundError("Selected Option");
	}

	return selectedOption;
}

function validateSnapshot(
	snapshot: QuestionSnapshotInput,
	question: { id: string; skillId: string },
	selectedOptionId: string,
) {
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

async function findAnswer(
	db: LessonDatabase,
	lessonId: string,
	questionId: string,
) {
	const [answer] = await db
		.select({
			id: lessonAnswers.id,
			isCorrect: lessonAnswers.isCorrect,
		})
		.from(lessonAnswers)
		.where(
			and(
				eq(lessonAnswers.lessonId, lessonId),
				eq(lessonAnswers.questionId, questionId),
			),
		)
		.limit(1);

	return answer;
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

function validateUniqueIds(ids: string[]) {
	const uniqueIds = [...new Set(ids)];
	if (uniqueIds.length !== ids.length) {
		throw new LessonValidationError("IDs must be unique");
	}

	return uniqueIds;
}
