import type {
	LessonAnswer,
	Lesson as PersistedLesson,
	Question,
	Skill,
} from "@/shared/db";

export type LessonSummaryQuestion = Readonly<
	Pick<Question, "id" | "timestampSeconds">
> & {
	readonly answer: Readonly<Pick<LessonAnswer, "isCorrect">> | null;
	readonly skill: Readonly<Pick<Skill, "id" | "name">>;
};

export type Lesson = Readonly<
	Omit<PersistedLesson, "completedAt" | "status">
> & {
	readonly completedAt: NonNullable<PersistedLesson["completedAt"]>;
	readonly questions: readonly LessonSummaryQuestion[];
	readonly status: Extract<PersistedLesson["status"], "completed">;
};

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
