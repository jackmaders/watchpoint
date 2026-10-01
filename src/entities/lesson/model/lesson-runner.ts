import { compareStrings } from "@/shared/lib/compare-strings";
import type {
	CreateLessonRunnerContextOptions,
	LessonRunnerAnswer,
	LessonRunnerContext,
	LessonRunnerQuestion,
} from "./lesson-runner-types";

export function createLessonRunnerContext<
	TQuestion extends LessonRunnerQuestion,
	TAnswer extends LessonRunnerAnswer,
>(
	options: CreateLessonRunnerContextOptions<TQuestion, TAnswer>,
): LessonRunnerContext<TQuestion, TAnswer> {
	const sortedQuestions = [...options.questions].sort(compareQuestions);
	const answers = options.answers ? [...options.answers] : [];
	const answeredIds = new Set(answers.map((a) => a.questionId));
	const isCompleted =
		sortedQuestions.length > 0 &&
		sortedQuestions.every((q) => answeredIds.has(q.id));

	return {
		questions: sortedQuestions,
		answers,
		activeQuestion: null,
		status: isCompleted ? "completed" : "in_progress",
	};
}

export function triggerMarker<
	TQuestion extends LessonRunnerQuestion,
	TAnswer extends LessonRunnerAnswer,
>(
	context: LessonRunnerContext<TQuestion, TAnswer>,
	marker: LessonRunnerQuestion,
): LessonRunnerContext<TQuestion, TAnswer> {
	const matchingQuestion = context.questions.find((q) => q.id === marker.id);
	if (!matchingQuestion) {
		return context;
	}

	const isAnswered = context.answers.some(
		(a) => a.questionId === matchingQuestion.id,
	);
	if (isAnswered) {
		return context;
	}

	if (context.activeQuestion?.id === matchingQuestion.id) {
		return context;
	}

	return {
		...context,
		activeQuestion: matchingQuestion,
	};
}

export function recordAnswer<
	TQuestion extends LessonRunnerQuestion,
	TAnswer extends LessonRunnerAnswer,
>(
	context: LessonRunnerContext<TQuestion, TAnswer>,
	answer: TAnswer,
): LessonRunnerContext<TQuestion, TAnswer> {
	const alreadyAnswered = context.answers.some(
		(a) => a.questionId === answer.questionId,
	);
	if (alreadyAnswered) {
		return context;
	}

	const isCurrentlyActive = context.activeQuestion?.id === answer.questionId;

	return {
		...context,
		answers: [...context.answers, answer],
		activeQuestion: isCurrentlyActive ? null : context.activeQuestion,
	};
}

export function getNextUnansweredQuestion<
	TQuestion extends LessonRunnerQuestion,
	TAnswer extends LessonRunnerAnswer,
>(context: LessonRunnerContext<TQuestion, TAnswer>): TQuestion | null {
	const answeredIds = new Set(context.answers.map((a) => a.questionId));
	return context.questions.find((q) => !answeredIds.has(q.id)) ?? null;
}

export function resumeLessonRunner<
	TQuestion extends LessonRunnerQuestion,
	TAnswer extends LessonRunnerAnswer,
>(
	context: LessonRunnerContext<TQuestion, TAnswer>,
): LessonRunnerContext<TQuestion, TAnswer> {
	const nextQuestion = getNextUnansweredQuestion(context);
	if (context.activeQuestion?.id === nextQuestion?.id) {
		return context;
	}

	return {
		...context,
		activeQuestion: nextQuestion,
	};
}

export function completeLessonRunner<
	TQuestion extends LessonRunnerQuestion,
	TAnswer extends LessonRunnerAnswer,
>(
	context: LessonRunnerContext<TQuestion, TAnswer>,
): LessonRunnerContext<TQuestion, TAnswer> {
	if (context.status === "completed") {
		return context;
	}

	const hasUnansweredQuestions = getNextUnansweredQuestion(context) !== null;
	if (hasUnansweredQuestions) {
		return context;
	}

	return {
		...context,
		status: "completed",
	};
}

function compareQuestions(
	left: LessonRunnerQuestion,
	right: LessonRunnerQuestion,
): number {
	if (left.timestampSeconds !== right.timestampSeconds) {
		return left.timestampSeconds - right.timestampSeconds;
	}
	return compareStrings(left.id, right.id);
}
