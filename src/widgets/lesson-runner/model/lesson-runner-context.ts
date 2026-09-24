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
	| { readonly type: "cue"; readonly questionId: string }
	| { readonly type: "answer"; readonly answer: LessonRunnerAnswer }
	| { readonly type: "resume" }
	| { readonly type: "complete" };

export interface CreateLessonRunnerContextOptions {
	readonly answers?: readonly LessonRunnerAnswer[];
	readonly questions: readonly LessonRunnerQuestion[];
}

/** Creates a stable runner context with Questions ordered by VOD timestamp. */
export function createLessonRunnerContext({
	questions,
	answers = [],
}: CreateLessonRunnerContextOptions): LessonRunnerContext {
	const orderedQuestions = [...questions].sort(compareQuestions);
	const knownQuestionIds = new Set(
		orderedQuestions.map((question) => question.id),
	);
	const uniqueAnswers = answers.filter(
		(answer, index, allAnswers) =>
			knownQuestionIds.has(answer.questionId) &&
			allAnswers.findIndex(
				(candidate) => candidate.questionId === answer.questionId,
			) === index,
	);

	return {
		questions: orderedQuestions,
		answers: uniqueAnswers,
		activeQuestionId: null,
		status: "in_progress",
	};
}

/** Returns the first Question without an Answer, or null when the Lesson is complete. */
export function getNextUnansweredQuestion(
	context: LessonRunnerContext,
): LessonRunnerQuestion | null {
	const answeredQuestionIds = new Set(
		context.answers.map((answer) => answer.questionId),
	);

	return (
		context.questions.find(
			(question) => !answeredQuestionIds.has(question.id),
		) ?? null
	);
}

/** Applies one deterministic Lesson Runner transition without mutating the input context. */
export function transitionLessonRunner(
	context: LessonRunnerContext,
	transition: LessonRunnerTransition,
): LessonRunnerContext {
	switch (transition.type) {
		case "cue":
			return transitionCue(context, transition.questionId);
		case "answer":
			return transitionAnswer(context, transition.answer);
		case "resume":
			return transitionResume(context);
		case "complete":
			return transitionComplete(context);
		default:
			return assertNever(transition);
	}
}

function transitionCue(
	context: LessonRunnerContext,
	questionId: string,
): LessonRunnerContext {
	if (
		context.status === "completed" ||
		context.activeQuestionId === questionId ||
		!context.questions.some((question) => question.id === questionId) ||
		context.answers.some((answer) => answer.questionId === questionId)
	) {
		return context;
	}

	return { ...context, activeQuestionId: questionId };
}

function transitionAnswer(
	context: LessonRunnerContext,
	answer: LessonRunnerAnswer,
): LessonRunnerContext {
	if (
		context.status === "completed" ||
		!context.questions.some((question) => question.id === answer.questionId) ||
		context.answers.some(
			(existingAnswer) => existingAnswer.questionId === answer.questionId,
		)
	) {
		return context;
	}

	return {
		...context,
		answers: [...context.answers, answer],
		activeQuestionId: null,
	};
}

function transitionResume(context: LessonRunnerContext): LessonRunnerContext {
	if (context.status === "completed") {
		return context;
	}

	return {
		...context,
		activeQuestionId: getNextUnansweredQuestion(context)?.id ?? null,
	};
}

function transitionComplete(context: LessonRunnerContext): LessonRunnerContext {
	if (context.status === "completed" || getNextUnansweredQuestion(context)) {
		return context;
	}

	return { ...context, activeQuestionId: null, status: "completed" };
}

function compareQuestions(
	left: LessonRunnerQuestion,
	right: LessonRunnerQuestion,
): number {
	return (
		left.timestampSeconds - right.timestampSeconds ||
		left.id.localeCompare(right.id)
	);
}

function assertNever(value: never): never {
	throw new Error(`Unknown Lesson Runner transition: ${String(value)}`);
}
