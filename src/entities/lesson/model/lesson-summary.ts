export interface LessonSummaryQuestion {
	isCorrect: boolean | null;
	skillId: string;
}

export interface CalculateLessonSummaryInput {
	completedAt: Date;
	createdAt: Date;
	questions: readonly LessonSummaryQuestion[];
}

export interface SkillSummary {
	answeredQuestions: number;
	correctAnswers: number;
	percentage: number;
	skillId: string;
	totalQuestions: number;
	unansweredQuestions: number;
}

export interface LessonSummary {
	answeredQuestions: number;
	completionTimeMs: number;
	correctAnswers: number;
	scorePercentage: number;
	skills: SkillSummary[];
	totalQuestions: number;
	unansweredQuestions: number;
}

/**
 * Calculates review metrics from persisted Lesson instants and Questions.
 * Dates are UTC instants; elapsed time is their non-negative millisecond difference.
 * Score and Skill percentages use all Questions as the denominator, with unanswered
 * Questions contributing zero credit. Empty input returns zero metrics and no Skills.
 */
export function calculateLessonSummary({
	createdAt,
	completedAt,
	questions,
}: CalculateLessonSummaryInput): LessonSummary {
	const totalQuestions = questions.length;
	const correctAnswers = questions.filter(
		(question) => question.isCorrect === true,
	).length;
	const answeredQuestions = questions.filter(
		(question) => question.isCorrect !== null,
	).length;

	return {
		completionTimeMs: Math.max(0, completedAt.getTime() - createdAt.getTime()),
		totalQuestions,
		answeredQuestions,
		unansweredQuestions: totalQuestions - answeredQuestions,
		correctAnswers,
		scorePercentage: percentage(correctAnswers, totalQuestions),
		skills: aggregateSkills(questions),
	};
}

function aggregateSkills(
	questions: readonly LessonSummaryQuestion[],
): SkillSummary[] {
	const summaries = new Map<string, SkillSummary>();

	for (const question of questions) {
		const summary = summaries.get(question.skillId) ?? {
			skillId: question.skillId,
			totalQuestions: 0,
			answeredQuestions: 0,
			unansweredQuestions: 0,
			correctAnswers: 0,
			percentage: 0,
		};

		summary.totalQuestions += 1;
		if (question.isCorrect === null) {
			summary.unansweredQuestions += 1;
		} else {
			summary.answeredQuestions += 1;
		}
		if (question.isCorrect === true) {
			summary.correctAnswers += 1;
		}
		summary.percentage = percentage(
			summary.correctAnswers,
			summary.totalQuestions,
		);
		summaries.set(question.skillId, summary);
	}

	return [...summaries.values()];
}

function percentage(numerator: number, denominator: number): number {
	if (denominator === 0) {
		return 0;
	}

	return Math.round((numerator / denominator) * 10000) / 100;
}
