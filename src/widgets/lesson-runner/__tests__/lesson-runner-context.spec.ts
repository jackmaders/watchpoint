import { describe, expect, test } from "vitest";
import {
	createLessonRunnerContext,
	getNextUnansweredQuestion,
	transitionLessonRunner,
} from "../index";

const questions = [
	{ id: "question-late", timestampSeconds: 30 },
	{ id: "question-early", timestampSeconds: 10 },
	{ id: "question-middle", timestampSeconds: 20 },
];

describe("Lesson Runner context", () => {
	test("orders Questions by VOD timestamp", () => {
		const context = createLessonRunnerContext({ questions });

		expect(context.questions.map((question) => question.id)).toEqual([
			"question-early",
			"question-middle",
			"question-late",
		]);
	});

	test("derives the first unanswered Question from existing Answers", () => {
		const context = createLessonRunnerContext({
			questions,
			answers: [{ questionId: "question-early" }],
		});

		expect(getNextUnansweredQuestion(context)?.id).toBe("question-middle");
	});

	test("resume activates the next unanswered Question", () => {
		const context = createLessonRunnerContext({
			questions,
			answers: [{ questionId: "question-early" }],
		});

		const resumed = transitionLessonRunner(context, { type: "resume" });

		expect(resumed.activeQuestionId).toBe("question-middle");
	});

	test("marker activates an unanswered Question", () => {
		const context = createLessonRunnerContext({ questions });

		const marked = transitionLessonRunner(context, {
			type: "marker",
			questionId: "question-middle",
		});

		expect(marked.activeQuestionId).toBe("question-middle");
	});

	test("repeated marker for the active Question preserves context identity", () => {
		const context = transitionLessonRunner(
			createLessonRunnerContext({ questions }),
			{ type: "marker", questionId: "question-middle" },
		);

		const repeatedMarker = transitionLessonRunner(context, {
			type: "marker",
			questionId: "question-middle",
		});

		expect(repeatedMarker).toBe(context);
	});

	test("a duplicate marker cannot reopen an answered Question", () => {
		const context = createLessonRunnerContext({
			questions,
			answers: [{ questionId: "question-middle" }],
		});

		const marked = transitionLessonRunner(context, {
			type: "marker",
			questionId: "question-middle",
		});

		expect(marked).toBe(context);
		expect(marked.activeQuestionId).toBeNull();
	});

	test("answer clears the active Question and records the Answer once", () => {
		const context = transitionLessonRunner(
			createLessonRunnerContext({ questions }),
			{ type: "marker", questionId: "question-early" },
		);

		const answered = transitionLessonRunner(context, {
			type: "answer",
			answer: { questionId: "question-early" },
		});
		const duplicate = transitionLessonRunner(answered, {
			type: "answer",
			answer: { questionId: "question-early" },
		});

		expect(answered.activeQuestionId).toBeNull();
		expect(answered.answers).toEqual([{ questionId: "question-early" }]);
		expect(duplicate).toBe(answered);
	});

	test("completion changes status only after every Question is answered", () => {
		const context = createLessonRunnerContext({
			questions,
			answers: questions.map(({ id }) => ({ questionId: id })),
		});

		const completed = transitionLessonRunner(context, { type: "complete" });

		expect(completed.status).toBe("completed");
		expect(completed.activeQuestionId).toBeNull();
	});

	test("completion remains in progress while a Question is unanswered", () => {
		const context = createLessonRunnerContext({ questions });

		const unchanged = transitionLessonRunner(context, { type: "complete" });

		expect(unchanged).toBe(context);
		expect(unchanged.status).toBe("in_progress");
	});
});
