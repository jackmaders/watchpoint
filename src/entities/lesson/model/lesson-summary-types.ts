export interface LessonSummaryQuestion {
	readonly answer: {
		readonly isCorrect: boolean;
	} | null;
	readonly id: string;
	readonly skill: {
		readonly id: string;
		readonly name: string;
	};
	readonly timestampSeconds: number;
}

export interface LessonSummaryInput {
	readonly completedAt: Date;
	readonly createdAt: Date;
	readonly questions: readonly LessonSummaryQuestion[];
}

export interface Score {
	readonly answeredQuestionCount: number;
	readonly correctQuestionCount: number;
	readonly percentage: number;
	readonly totalQuestionCount: number;
	readonly unansweredQuestionCount: number;
}

export interface SkillSummary {
	readonly score: Score;
	readonly skillId: string;
	readonly skillName: string;
}

export interface LessonSummary {
	readonly lessonDurationSeconds: number;
	readonly score: Score;
	readonly skillSummaries: readonly SkillSummary[];
}
