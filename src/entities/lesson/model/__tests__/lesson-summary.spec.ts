import { describe, expect, test } from "vitest";
import { calculateLessonSummary } from "../../index";

type LessonSummaryQuestion = Parameters<
	typeof calculateLessonSummary
>[0]["questions"][number];

describe("calculateLessonSummary", () => {
	test("scores a correctly answered Question as 100 percent", () => {
		const summary = summarize([
			question({ id: "question-1", timestampSeconds: 10 }),
		]);

		expect(summary.score).toEqual({
			totalQuestionCount: 1,
			answeredQuestionCount: 1,
			unansweredQuestionCount: 0,
			correctQuestionCount: 1,
			percentage: 100,
		});
	});

	test("counts an incorrect Answer without adding it to the correct count", () => {
		const summary = summarize([
			question({
				id: "question-1",
				timestampSeconds: 10,
				answer: { isCorrect: false },
			}),
		]);

		expect(summary.score).toEqual({
			totalQuestionCount: 1,
			answeredQuestionCount: 1,
			unansweredQuestionCount: 0,
			correctQuestionCount: 0,
			percentage: 0,
		});
	});

	test("includes unanswered Questions in the Score denominator", () => {
		const summary = summarize([
			question({ id: "question-1", timestampSeconds: 10 }),
			question({
				id: "question-2",
				timestampSeconds: 20,
				answer: { isCorrect: false },
			}),
			question({
				id: "question-3",
				timestampSeconds: 30,
				answer: null,
			}),
		]);

		expect(summary.score).toEqual({
			totalQuestionCount: 3,
			answeredQuestionCount: 2,
			unansweredQuestionCount: 1,
			correctQuestionCount: 1,
			percentage: 33,
		});
	});

	test("aggregates Questions into separate Skill Scores", () => {
		const summary = summarize([
			question({
				id: "question-1",
				timestampSeconds: 10,
				skillId: "strategy",
				skillName: "Strategy",
			}),
			question({
				id: "question-2",
				timestampSeconds: 20,
				skillId: "strategy",
				skillName: "Strategy",
				answer: { isCorrect: false },
			}),
			question({
				id: "question-3",
				timestampSeconds: 30,
				skillId: "tracking",
				skillName: "Tracking",
				answer: null,
			}),
		]);

		expect(summary.skillSummaries).toEqual([
			{
				skillId: "strategy",
				skillName: "Strategy",
				score: {
					totalQuestionCount: 2,
					answeredQuestionCount: 2,
					unansweredQuestionCount: 0,
					correctQuestionCount: 1,
					percentage: 50,
				},
			},
			{
				skillId: "tracking",
				skillName: "Tracking",
				score: {
					totalQuestionCount: 1,
					answeredQuestionCount: 0,
					unansweredQuestionCount: 1,
					correctQuestionCount: 0,
					percentage: 0,
				},
			},
		]);
	});

	test("rounds Lesson Duration halves upward to the nearest second", () => {
		const summary = calculateLessonSummary({
			createdAt: new Date(0),
			completedAt: new Date(1_500),
			questions: [],
		});

		expect(summary.lessonDurationSeconds).toBe(2);
	});

	test("clamps reversed Lesson timestamps to zero duration", () => {
		const summary = calculateLessonSummary({
			createdAt: new Date(3_000),
			completedAt: new Date(2_000),
			questions: [],
		});

		expect(summary.lessonDurationSeconds).toBe(0);
	});

	test("preserves duration and returns empty Scores when there are no Questions", () => {
		const summary = calculateLessonSummary({
			createdAt: new Date(0),
			completedAt: new Date(12_000),
			questions: [],
		});

		expect(summary).toEqual({
			lessonDurationSeconds: 12,
			score: {
				totalQuestionCount: 0,
				answeredQuestionCount: 0,
				unansweredQuestionCount: 0,
				correctQuestionCount: 0,
				percentage: 0,
			},
			skillSummaries: [],
		});
	});

	test("rounds Score percentage halves upward", () => {
		const summary = summarize([
			question({ id: "question-1", timestampSeconds: 10 }),
			...Array.from({ length: 7 }, (_, index) =>
				question({
					id: `incorrect-${index}`,
					timestampSeconds: 20 + index,
					answer: { isCorrect: false },
				}),
			),
		]);

		expect(summary.score.percentage).toBe(13);
	});

	test("uses the earliest Question timestamp and ID to choose a captured Skill name", () => {
		const summary = summarize([
			question({
				id: "question-z",
				timestampSeconds: 20,
				skillId: "skill-1",
				skillName: "Later Name",
			}),
			question({
				id: "question-b",
				timestampSeconds: 10,
				skillId: "skill-1",
				skillName: "Tie Loser",
			}),
			question({
				id: "question-a",
				timestampSeconds: 10,
				skillId: "skill-1",
				skillName: "Earliest Name",
			}),
		]);

		expect(summary.skillSummaries[0]?.skillName).toBe("Earliest Name");
	});

	test("sorts Skill Summaries by case-insensitive captured name and then Skill ID", () => {
		const summary = summarize([
			question({
				id: "question-1",
				timestampSeconds: 10,
				skillId: "skill-z",
				skillName: "Bravo",
			}),
			question({
				id: "question-2",
				timestampSeconds: 20,
				skillId: "skill-b",
				skillName: "alpha",
			}),
			question({
				id: "question-3",
				timestampSeconds: 30,
				skillId: "skill-a",
				skillName: "Alpha",
			}),
		]);

		expect(summary.skillSummaries.map(({ skillId }) => skillId)).toEqual([
			"skill-a",
			"skill-b",
			"skill-z",
		]);
	});
});

function summarize(questions: readonly LessonSummaryQuestion[]) {
	return calculateLessonSummary({
		createdAt: new Date(0),
		completedAt: new Date(0),
		questions,
	});
}

function question({
	id,
	timestampSeconds,
	skillId = "skill-1",
	skillName = "Strategy",
	answer = { isCorrect: true },
}: {
	id: string;
	timestampSeconds: number;
	skillId?: string;
	skillName?: string;
	answer?: LessonSummaryQuestion["answer"];
}): LessonSummaryQuestion {
	return {
		id,
		timestampSeconds,
		skill: { id: skillId, name: skillName },
		answer,
	};
}
