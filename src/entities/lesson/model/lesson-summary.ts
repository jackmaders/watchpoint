import type {
	LessonSummary,
	LessonSummaryInput,
	LessonSummaryQuestion,
	Score,
	SkillSummary,
} from "./lesson-summary-types";

type ScoreCounts = Omit<Score, "percentage">;

interface EarliestQuestion {
	questionId: string;
	timestampSeconds: number;
}

interface SkillAggregation {
	earliestQuestion: EarliestQuestion;
	scoreCounts: ScoreCounts;
	skillId: string;
	skillName: string;
}

/** Calculates a completed Lesson summary from valid UTC instants and its complete Question set. */
export function calculateLessonSummary({
	createdAt,
	completedAt,
	questions,
}: LessonSummaryInput): LessonSummary {
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
					questionId: question.id,
					timestampSeconds: question.timestampSeconds,
				},
				scoreCounts: createScoreCounts(),
			};
			skillAggregations.set(question.skill.id, aggregation);
		} else if (isEarlierQuestion(question, aggregation.earliestQuestion)) {
			aggregation.skillName = question.skill.name;
			aggregation.earliestQuestion = {
				questionId: question.id,
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

	return {
		lessonDurationSeconds: Math.max(
			0,
			Math.round((completedAt.getTime() - createdAt.getTime()) / 1000),
		),
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

	return compareStrings(question.id, earliestQuestion.questionId) < 0;
}

function compareSkillSummaries(left: SkillSummary, right: SkillSummary) {
	const nameOrder = compareStrings(
		left.skillName.toLowerCase(),
		right.skillName.toLowerCase(),
	);

	return nameOrder || compareStrings(left.skillId, right.skillId);
}

function compareStrings(left: string, right: string) {
	if (left < right) {
		return -1;
	}

	return left > right ? 1 : 0;
}
