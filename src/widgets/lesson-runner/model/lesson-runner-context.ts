import type {
	CreateLessonRunnerContextOptions,
	LessonRunnerContext,
	LessonRunnerQuestion,
} from "./lesson-runner-types";

/** Creates a stable runner context with Questions ordered by VOD timestamp. */
export function createLessonRunnerContext({
	questions,
	answers = [],
}: CreateLessonRunnerContextOptions) {
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
	} satisfies LessonRunnerContext;
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

function compareQuestions(
	left: LessonRunnerQuestion,
	right: LessonRunnerQuestion,
): number {
	return (
		left.timestampSeconds - right.timestampSeconds ||
		left.id.localeCompare(right.id)
	);
}
