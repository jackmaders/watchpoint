import { getNextUnansweredQuestion } from "./lesson-runner-context";
import type {
	LessonRunnerAnswer,
	LessonRunnerContext,
	LessonRunnerTransition,
} from "./lesson-runner-types";

/** Applies one deterministic Lesson Runner transition without mutating the input context. */
export function transitionLessonRunner(
	context: LessonRunnerContext,
	transition: LessonRunnerTransition,
): LessonRunnerContext {
	switch (transition.type) {
		case "marker":
			return transitionMarker(context, transition.questionId);
		case "answer":
			return transitionAnswer(context, transition.answer);
		case "resume":
			return transitionResume(context);
		case "complete":
			return transitionComplete(context);
		default:
			throw new Error(
				`Unknown Lesson Runner transition: ${String(transition)}`,
			);
	}
}

function transitionMarker(
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
