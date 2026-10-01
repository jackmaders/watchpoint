import { describe, expect, test } from "vitest";
import {
	completeLessonRunner,
	createLessonRunnerContext,
	getNextUnansweredQuestion,
	type LessonRunnerAnswer,
	type LessonRunnerQuestion,
	recordAnswer,
	resumeLessonRunner,
	triggerMarker,
} from "../../index";

describe("createLessonRunnerContext", () => {
	test("orders Questions by VOD timestamp ascending", () => {
		const questions: readonly LessonRunnerQuestion[] = [
			{ id: "q-3", timestampSeconds: 30 },
			{ id: "q-1", timestampSeconds: 10 },
			{ id: "q-2", timestampSeconds: 20 },
		];

		const context = createLessonRunnerContext({ questions });

		expect(context.questions.map((q) => q.id)).toEqual(["q-1", "q-2", "q-3"]);
		expect(context.activeQuestion).toBeNull();
		expect(context.status).toBe("in_progress");
		expect(context.answers).toEqual([]);
	});

	test("breaks ties between Questions with identical timestamps using ID", () => {
		const questions: readonly LessonRunnerQuestion[] = [
			{ id: "q-b", timestampSeconds: 15 },
			{ id: "q-a", timestampSeconds: 15 },
		];

		const context = createLessonRunnerContext({ questions });

		expect(context.questions.map((q) => q.id)).toEqual(["q-a", "q-b"]);
	});

	test("initializes status to completed when all Questions already have Answers", () => {
		const questions: readonly LessonRunnerQuestion[] = [
			{ id: "q-1", timestampSeconds: 10 },
		];
		const answers: readonly LessonRunnerAnswer[] = [{ questionId: "q-1" }];

		const context = createLessonRunnerContext({ questions, answers });

		expect(context.status).toBe("completed");
	});
});

describe("triggerMarker", () => {
	test("activates a known, unanswered Question", () => {
		const questions: readonly LessonRunnerQuestion[] = [
			{ id: "q-1", timestampSeconds: 10 },
			{ id: "q-2", timestampSeconds: 20 },
		];
		const context = createLessonRunnerContext({ questions });

		const next = triggerMarker(context, { id: "q-1", timestampSeconds: 10 });

		expect(next.activeQuestion).toEqual({ id: "q-1", timestampSeconds: 10 });
	});

	test("ignores repeated markers for the already active Question", () => {
		const questions: readonly LessonRunnerQuestion[] = [
			{ id: "q-1", timestampSeconds: 10 },
		];
		const initial = createLessonRunnerContext({ questions });
		const active = triggerMarker(initial, { id: "q-1", timestampSeconds: 10 });

		const repeated = triggerMarker(active, { id: "q-1", timestampSeconds: 10 });

		expect(repeated).toBe(active);
	});

	test("ignores markers for Questions that already have Answers", () => {
		const questions: readonly LessonRunnerQuestion[] = [
			{ id: "q-1", timestampSeconds: 10 },
		];
		const answers: readonly LessonRunnerAnswer[] = [{ questionId: "q-1" }];
		const context = createLessonRunnerContext({ questions, answers });

		const next = triggerMarker(context, { id: "q-1", timestampSeconds: 10 });

		expect(next).toBe(context);
		expect(next.activeQuestion).toBeNull();
	});

	test("ignores unknown markers not present in the Questions", () => {
		const questions: readonly LessonRunnerQuestion[] = [
			{ id: "q-1", timestampSeconds: 10 },
		];
		const context = createLessonRunnerContext({ questions });

		const next = triggerMarker(context, {
			id: "q-unknown",
			timestampSeconds: 5,
		});

		expect(next).toBe(context);
		expect(next.activeQuestion).toBeNull();
	});
});

describe("recordAnswer", () => {
	test("marks its Question answered and clears the Active Question", () => {
		const questions: readonly LessonRunnerQuestion[] = [
			{ id: "q-1", timestampSeconds: 10 },
		];
		const initial = createLessonRunnerContext({ questions });
		const active = triggerMarker(initial, { id: "q-1", timestampSeconds: 10 });

		const next = recordAnswer(active, { questionId: "q-1" });

		expect(next.activeQuestion).toBeNull();
		expect(next.answers).toEqual([{ questionId: "q-1" }]);
	});

	test("does not add a duplicate Answer if an Answer already exists for the Question", () => {
		const questions: readonly LessonRunnerQuestion[] = [
			{ id: "q-1", timestampSeconds: 10 },
		];
		const answers: readonly LessonRunnerAnswer[] = [{ questionId: "q-1" }];
		const context = createLessonRunnerContext({ questions, answers });

		const next = recordAnswer(context, { questionId: "q-1" });

		expect(next).toBe(context);
		expect(next.answers).toEqual([{ questionId: "q-1" }]);
	});
});

describe("getNextUnansweredQuestion", () => {
	test("returns the earliest unanswered Question by timestamp order", () => {
		const questions: readonly LessonRunnerQuestion[] = [
			{ id: "q-1", timestampSeconds: 10 },
			{ id: "q-2", timestampSeconds: 20 },
			{ id: "q-3", timestampSeconds: 30 },
		];
		const answers: readonly LessonRunnerAnswer[] = [{ questionId: "q-1" }];
		const context = createLessonRunnerContext({ questions, answers });

		const next = getNextUnansweredQuestion(context);

		expect(next).toEqual({ id: "q-2", timestampSeconds: 20 });
	});

	test("returns null when all Questions have been answered", () => {
		const questions: readonly LessonRunnerQuestion[] = [
			{ id: "q-1", timestampSeconds: 10 },
		];
		const answers: readonly LessonRunnerAnswer[] = [{ questionId: "q-1" }];
		const context = createLessonRunnerContext({ questions, answers });

		const next = getNextUnansweredQuestion(context);

		expect(next).toBeNull();
	});
});

describe("resumeLessonRunner", () => {
	test("selects the earliest unanswered Question as the Active Question", () => {
		const questions: readonly LessonRunnerQuestion[] = [
			{ id: "q-1", timestampSeconds: 10 },
			{ id: "q-2", timestampSeconds: 20 },
			{ id: "q-3", timestampSeconds: 30 },
		];
		const answers: readonly LessonRunnerAnswer[] = [{ questionId: "q-1" }];
		const context = createLessonRunnerContext({ questions, answers });

		const next = resumeLessonRunner(context);

		expect(next.activeQuestion).toEqual({ id: "q-2", timestampSeconds: 20 });
	});

	test("sets Active Question to null when no unanswered Questions remain", () => {
		const questions: readonly LessonRunnerQuestion[] = [
			{ id: "q-1", timestampSeconds: 10 },
		];
		const answers: readonly LessonRunnerAnswer[] = [{ questionId: "q-1" }];
		const context = createLessonRunnerContext({ questions, answers });

		const next = resumeLessonRunner(context);

		expect(next.activeQuestion).toBeNull();
	});
});

describe("completeLessonRunner", () => {
	test("changes the Lesson Runner status to completed when every Question has an Answer", () => {
		const questions: readonly LessonRunnerQuestion[] = [
			{ id: "q-1", timestampSeconds: 10 },
			{ id: "q-2", timestampSeconds: 20 },
		];
		const answers: readonly LessonRunnerAnswer[] = [
			{ questionId: "q-1" },
			{ questionId: "q-2" },
		];
		const context = createLessonRunnerContext({ questions, answers });

		const next = completeLessonRunner(context);

		expect(next.status).toBe("completed");
	});

	test("does not change the status if any Question remains unanswered", () => {
		const questions: readonly LessonRunnerQuestion[] = [
			{ id: "q-1", timestampSeconds: 10 },
			{ id: "q-2", timestampSeconds: 20 },
		];
		const answers: readonly LessonRunnerAnswer[] = [{ questionId: "q-1" }];
		const context = createLessonRunnerContext({ questions, answers });

		const next = completeLessonRunner(context);

		expect(next).toBe(context);
		expect(next.status).toBe("in_progress");
	});

	test("returns context unchanged if it is already completed", () => {
		const questions: readonly LessonRunnerQuestion[] = [
			{ id: "q-1", timestampSeconds: 10 },
		];
		const answers: readonly LessonRunnerAnswer[] = [{ questionId: "q-1" }];
		const context = createLessonRunnerContext({ questions, answers });
		const completed = completeLessonRunner(context);

		const repeated = completeLessonRunner(completed);

		expect(repeated).toBe(completed);
	});
});
