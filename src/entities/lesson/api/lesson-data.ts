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
import { LessonNotFoundError } from "../model/lesson-errors";
import type { LessonDatabase } from "./lesson-handler-types";

export async function requireVod(db: LessonDatabase, vodId: string) {
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

export async function requireSkills(db: LessonDatabase, skillIds: string[]) {
	const existingSkills = await db
		.select({ id: skills.id })
		.from(skills)
		.where(inArray(skills.id, skillIds));

	if (existingSkills.length !== skillIds.length) {
		throw new LessonNotFoundError("One or more Skills");
	}
}

export async function requireOwnedLesson(
	db: LessonDatabase,
	{ lessonId, userId }: { lessonId: string; userId: string },
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

export async function requireLessonQuestion(
	db: LessonDatabase,
	{
		vodId,
		selectedSkillIds,
		questionId,
	}: { vodId: string; selectedSkillIds: string[]; questionId: string },
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

export async function requireQuestionOption(
	db: LessonDatabase,
	{
		questionId,
		selectedOptionId,
	}: { questionId: string; selectedOptionId: string },
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

export async function findAnswer(
	db: LessonDatabase,
	{ lessonId, questionId }: { lessonId: string; questionId: string },
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
