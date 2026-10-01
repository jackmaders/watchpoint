import { eq } from "drizzle-orm";
import { lessonAnswers, lessonSelectedSkills, lessons } from "@/shared/db";
import { getDb } from "@/shared/db/index.server";
import { ServerFunctionError } from "@/shared/errors";
import { calculateLessonSummary } from "../model/lesson-summary";
import {
	type CompleteLessonInput,
	completeLessonInputSchema,
	type StartLessonInput,
	type SubmitLessonAnswerInput,
	startLessonInputSchema,
	submitLessonAnswerInputSchema,
	userIdSchema,
} from "../model/lesson-validation";

export async function startLessonHandler(
	input: StartLessonInput & { userId: string },
	db = getDb(),
) {
	const data = startLessonInputSchema
		.extend({ userId: userIdSchema })
		.parse(input);

	const vod = await db.query.vods.findFirst({
		where: { id: data.vodId },
	});

	if (!vod?.isPublished) {
		throw new ServerFunctionError("Published VOD not found", 404);
	}

	const [createdLesson] = await db
		.insert(lessons)
		.values({
			userId: data.userId,
			vodId: data.vodId,
			status: "in_progress",
		})
		.returning();

	if (!createdLesson) {
		throw new ServerFunctionError("Failed to create lesson", 500);
	}

	if (data.selectedSkillIds.length > 0) {
		await db.insert(lessonSelectedSkills).values(
			data.selectedSkillIds.map((skillId) => ({
				lessonId: createdLesson.id,
				skillId,
			})),
		);
	}

	return createdLesson;
}

export async function submitLessonAnswerHandler(
	input: SubmitLessonAnswerInput & { userId: string },
	db = getDb(),
) {
	const data = submitLessonAnswerInputSchema
		.extend({ userId: userIdSchema })
		.parse(input);

	const lesson = await db.query.lessons.findFirst({
		where: { id: data.lessonId },
	});

	if (!lesson) {
		throw new ServerFunctionError("Lesson not found", 404);
	}

	if (lesson.userId !== data.userId) {
		throw new ServerFunctionError("Forbidden", 403);
	}

	if (lesson.status !== "in_progress") {
		throw new ServerFunctionError("Lesson is not in progress", 400);
	}

	// Idempotency: duplicate answer submission returns existing answer
	const existingAnswer = await db.query.lessonAnswers.findFirst({
		where: {
			lessonId: data.lessonId,
			questionId: data.questionId,
		},
	});

	if (existingAnswer) {
		return existingAnswer;
	}

	const selectedOption = await db.query.options.findFirst({
		where: {
			id: data.selectedOptionId,
			questionId: data.questionId,
		},
	});

	if (!selectedOption) {
		throw new ServerFunctionError("Option not found for question", 404);
	}

	try {
		const [createdAnswer] = await db
			.insert(lessonAnswers)
			.values({
				lessonId: data.lessonId,
				questionId: data.questionId,
				selectedOptionId: data.selectedOptionId,
				isCorrect: selectedOption.isCorrect,
				timeSpentSeconds: data.timeSpentSeconds,
				questionSnapshot: data.snapshot,
			})
			.returning();

		return createdAnswer;
	} catch (error) {
		// Idempotency: if a concurrent insert succeeded, return the persisted answer
		const raceAnswer = await db.query.lessonAnswers.findFirst({
			where: {
				lessonId: data.lessonId,
				questionId: data.questionId,
			},
		});

		if (raceAnswer) {
			return raceAnswer;
		}

		throw error;
	}
}

export async function completeLessonHandler(
	input: CompleteLessonInput & { userId: string },
	db = getDb(),
) {
	const data = completeLessonInputSchema
		.extend({ userId: userIdSchema })
		.parse(input);

	const lesson = await db.query.lessons.findFirst({
		where: { id: data.lessonId },
		with: {
			selectedSkills: true,
			answers: true,
		},
	});

	if (!lesson) {
		throw new ServerFunctionError("Lesson not found", 404);
	}

	if (lesson.userId !== data.userId) {
		throw new ServerFunctionError("Forbidden", 403);
	}

	// Fetch all questions for the VOD with skill info
	const vodQuestions = await db.query.questions.findMany({
		where: { vodId: lesson.vodId },
		with: {
			skill: true,
		},
	});

	// Filter questions by selectedSkills if any were selected
	const selectedSkillIds = new Set(lesson.selectedSkills.map((s) => s.id));
	const requiredQuestions =
		selectedSkillIds.size > 0
			? vodQuestions.filter((q) => selectedSkillIds.has(q.skillId))
			: vodQuestions;

	const answersByQuestionId = new Map(
		lesson.answers.map((ans) => [ans.questionId, ans]),
	);

	// Check if all required questions are answered
	const unansweredRequired = requiredQuestions.filter(
		(q) => !answersByQuestionId.has(q.id),
	);

	if (unansweredRequired.length > 0 && lesson.status !== "completed") {
		throw new ServerFunctionError("Lesson has unanswered questions", 400);
	}

	let completedLesson = lesson;
	if (lesson.status !== "completed") {
		const completedAt = new Date();
		const [updated] = await db
			.update(lessons)
			.set({
				status: "completed",
				completedAt,
			})
			.where(eq(lessons.id, lesson.id))
			.returning();

		if (!updated) {
			throw new ServerFunctionError("Failed to update lesson", 500);
		}

		completedLesson = {
			...lesson,
			status: "completed",
			completedAt: updated.completedAt,
			updatedAt: updated.updatedAt,
		};
	}

	const summaryQuestions = requiredQuestions.flatMap((q) => {
		if (!q.skill) {
			return [];
		}
		const answer = answersByQuestionId.get(q.id);
		return [
			{
				id: q.id,
				timestampSeconds: q.timestampSeconds,
				skill: {
					id: q.skill.id,
					name: q.skill.name,
				},
				answer: answer ? { isCorrect: answer.isCorrect } : null,
			},
		];
	});

	const summary = calculateLessonSummary({
		id: completedLesson.id,
		userId: completedLesson.userId,
		vodId: completedLesson.vodId,
		createdAt: completedLesson.createdAt,
		completedAt: completedLesson.completedAt ?? new Date(),
		updatedAt: completedLesson.updatedAt,
		status: "completed",
		questions: summaryQuestions,
	});

	return {
		lesson: completedLesson,
		summary,
	};
}
