export type LessonRunnerStatus = "in_progress" | "completed";

export interface LessonRunnerQuestion {
	readonly id: string;
	readonly timestampSeconds: number;
}

export interface LessonRunnerAnswer {
	readonly questionId: string;
}

export interface LessonRunnerContext<
	TQuestion extends LessonRunnerQuestion = LessonRunnerQuestion,
	TAnswer extends LessonRunnerAnswer = LessonRunnerAnswer,
> {
	readonly activeQuestion: TQuestion | null;
	readonly answers: readonly TAnswer[];
	readonly questions: readonly TQuestion[];
	readonly status: LessonRunnerStatus;
}

export interface CreateLessonRunnerContextOptions<
	TQuestion extends LessonRunnerQuestion = LessonRunnerQuestion,
	TAnswer extends LessonRunnerAnswer = LessonRunnerAnswer,
> {
	readonly answers?: readonly TAnswer[];
	readonly questions: readonly TQuestion[];
}
