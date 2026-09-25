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
