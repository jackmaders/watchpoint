export interface LessonRunnerQuestion {
	readonly id: string;
	readonly timestampSeconds: number;
}

export interface LessonRunnerAnswer {
	readonly questionId: string;
}

export type LessonRunnerStatus = "in_progress" | "completed";

export interface LessonRunnerContext {
	readonly activeQuestionId: string | null;
	readonly answers: readonly LessonRunnerAnswer[];
	readonly questions: readonly LessonRunnerQuestion[];
	readonly status: LessonRunnerStatus;
}

export type LessonRunnerTransition =
	| { readonly type: "marker"; readonly questionId: string }
	| { readonly type: "answer"; readonly answer: LessonRunnerAnswer }
	| { readonly type: "resume" }
	| { readonly type: "complete" };

export interface CreateLessonRunnerContextOptions {
	readonly answers?: readonly LessonRunnerAnswer[];
	readonly questions: readonly LessonRunnerQuestion[];
}
