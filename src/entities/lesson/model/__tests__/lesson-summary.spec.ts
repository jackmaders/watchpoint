import { calculateLessonSummary } from "../..";

describe("calculateLessonSummary", () => {
	test("uses persisted UTC instants and preserves millisecond completion precision", () => {
		const summary = calculateLessonSummary({
			createdAt: new Date("2026-09-24T10:00:00.125Z"),
			completedAt: new Date("2026-09-24T10:01:02.875Z"),
			questions: [],
		});

		expect(summary.completionTimeMs).toBe(62_750);
	});

	test("scores answered and unanswered Questions against the full Lesson total", () => {
		const summary = calculateLessonSummary({
			createdAt: new Date("2026-09-24T10:00:00Z"),
			completedAt: new Date("2026-09-24T10:00:10Z"),
			questions: [
				{ skillId: "strategy", isCorrect: true },
				{ skillId: "strategy", isCorrect: false },
				{ skillId: "tactics", isCorrect: null },
			],
		});

		expect(summary.totalQuestions).toBe(3);
		expect(summary.answeredQuestions).toBe(2);
		expect(summary.unansweredQuestions).toBe(1);
		expect(summary.correctAnswers).toBe(1);
		expect(summary.scorePercentage).toBe(33.33);
	});

	test("aggregates mixed-Skill Questions in first-seen order", () => {
		const summary = calculateLessonSummary({
			createdAt: new Date("2026-09-24T10:00:00Z"),
			completedAt: new Date("2026-09-24T10:00:01Z"),
			questions: [
				{ skillId: "tactics", isCorrect: true },
				{ skillId: "strategy", isCorrect: false },
				{ skillId: "tactics", isCorrect: false },
				{ skillId: "strategy", isCorrect: true },
			],
		});

		expect(summary.skills).toEqual([
			{
				skillId: "tactics",
				totalQuestions: 2,
				answeredQuestions: 2,
				unansweredQuestions: 0,
				correctAnswers: 1,
				percentage: 50,
			},
			{
				skillId: "strategy",
				totalQuestions: 2,
				answeredQuestions: 2,
				unansweredQuestions: 0,
				correctAnswers: 1,
				percentage: 50,
			},
		]);
	});

	test("returns zeroed metrics for an empty Lesson", () => {
		const summary = calculateLessonSummary({
			createdAt: new Date("2026-09-24T10:00:00Z"),
			completedAt: new Date("2026-09-24T10:00:01Z"),
			questions: [],
		});

		expect(summary).toMatchObject({
			totalQuestions: 0,
			answeredQuestions: 0,
			unansweredQuestions: 0,
			correctAnswers: 0,
			scorePercentage: 0,
			skills: [],
		});
	});
});
