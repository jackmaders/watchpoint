import { compareStrings } from "@/shared/lib/compare-strings";
import type {
	Lesson,
	LessonSummary,
	LessonSummaryQuestion,
	Score,
	SkillSummary,
} from "./lesson-summary-types";

type ScoreCounts = Omit<Score, "percentage">;

type EarliestQuestion = Pick<LessonSummaryQuestion, "id" | "timestampSeconds">;

interface SkillAggregation {
	earliestQuestion: EarliestQuestion;
	scoreCounts: ScoreCounts;
	skillId: string;
	skillName: string;
}

/** Calculates a summary from a completed Lesson and its Questions. */
export function calculateLessonSummary(lesson: Lesson): LessonSummary {
	const { createdAt, completedAt, questions } = lesson;

	if (
		Number.isNaN(createdAt.getTime()) ||
		Number.isNaN(completedAt.getTime())
	) {
		throw new TypeError("Lesson createdAt and completedAt must be valid dates");
	}

	let scoreCounts = createScoreCounts();
	const skillAggregations = new Map<string, SkillAggregation>();

	for (const question of questions) {
		scoreCounts = addQuestionToScore(scoreCounts, question);

		let aggregation = skillAggregations.get(question.skill.id);
		if (!aggregation) {
			aggregation = {
				skillId: question.skill.id,
				skillName: question.skill.name,
				earliestQuestion: {
					id: question.id,
					timestampSeconds: question.timestampSeconds,
				},
				scoreCounts: createScoreCounts(),
			};
			skillAggregations.set(question.skill.id, aggregation);
		} else if (isEarlierQuestion(question, aggregation.earliestQuestion)) {
			aggregation.skillName = question.skill.name;
			aggregation.earliestQuestion = {
				id: question.id,
				timestampSeconds: question.timestampSeconds,
			};
		}

		aggregation.scoreCounts = addQuestionToScore(
			aggregation.scoreCounts,
			question,
		);
	}

	const skillSummaries = [...skillAggregations.values()]
		.map(
			({
				skillId,
				skillName,
				scoreCounts: skillScoreCounts,
			}): SkillSummary => ({
				skillId,
				skillName,
				score: createScore(skillScoreCounts),
			}),
		)
		.sort(compareSkillSummaries);

	const elapsedSeconds = Math.max(
		0,
		(completedAt.getTime() - createdAt.getTime()) / 1000,
	);

	return {
		lessonDurationSeconds: Math.round(elapsedSeconds),
		score: createScore(scoreCounts),
		skillSummaries,
	};
}

function createScoreCounts(): ScoreCounts {
	return {
		totalQuestionCount: 0,
		answeredQuestionCount: 0,
		unansweredQuestionCount: 0,
		correctQuestionCount: 0,
	};
}

function addQuestionToScore(
	counts: ScoreCounts,
	question: LessonSummaryQuestion,
): ScoreCounts {
	const unanswered = question.answer === null;

	return {
		totalQuestionCount: counts.totalQuestionCount + 1,
		answeredQuestionCount: counts.answeredQuestionCount + (unanswered ? 0 : 1),
		unansweredQuestionCount:
			counts.unansweredQuestionCount + (unanswered ? 1 : 0),
		correctQuestionCount:
			counts.correctQuestionCount + (question.answer?.isCorrect ? 1 : 0),
	};
}

function createScore(counts: ScoreCounts): Score {
	return {
		...counts,
		percentage:
			counts.totalQuestionCount === 0
				? 0
				: Math.round(
						(counts.correctQuestionCount / counts.totalQuestionCount) * 100,
					),
	};
}

function isEarlierQuestion(
	question: LessonSummaryQuestion,
	earliestQuestion: EarliestQuestion,
) {
	if (question.timestampSeconds !== earliestQuestion.timestampSeconds) {
		return question.timestampSeconds < earliestQuestion.timestampSeconds;
	}

	return compareStrings(question.id, earliestQuestion.id) < 0;
}

function compareSkillSummaries(left: SkillSummary, right: SkillSummary) {
	const nameOrder = compareStrings(
		left.skillName.toLowerCase(),
		right.skillName.toLowerCase(),
	);

	return nameOrder || compareStrings(left.skillId, right.skillId);
}
