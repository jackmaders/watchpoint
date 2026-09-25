import { describe, expect, test } from "vitest";
import {
	parseQuestionSnapshot,
	questionSnapshotSchema,
	validateQuestionSnapshotForAnswer,
} from "@/entities/lesson";

const completeQuestionSnapshot = {
	questionId: "question-1",
	prompt: "What is the best move?",
	explanation: "Take the safe angle before committing.",
	timestampSeconds: 42,
	skillId: "skill-strategy",
	skillName: "Strategy",
	skillSlug: "strategy",
	options: [
		{
			id: "option-1",
			orderIndex: 0,
			text: "Hold the angle",
			isCorrect: true,
		},
		{
			id: "option-2",
			orderIndex: 1,
			text: "Push immediately",
			isCorrect: false,
		},
	],
	selectedOption: {
		id: "option-2",
		orderIndex: 1,
		text: "Push immediately",
		isCorrect: false,
	},
} as const;

const legacyQuestionSnapshot = {
	questionId: "question-1",
	prompt: "What is the best move?",
	explanation: "Take the safe angle before committing.",
	timestampSeconds: 42,
	skillId: "skill-strategy",
	skillName: "Strategy",
	options: [
		{ id: "option-1", text: "Hold the angle", isCorrect: true },
		{ id: "option-2", text: "Push immediately", isCorrect: false },
	],
} as const;

const invalidQuestionSnapshot = {
	...completeQuestionSnapshot,
	options: completeQuestionSnapshot.options.map((option) => ({
		...option,
		orderIndex: 1,
	})),
} as const;

describe("QuestionSnapshot contract", () => {
	test("accepts a complete immutable review snapshot", () => {
		expect(parseQuestionSnapshot(completeQuestionSnapshot)).toEqual(
			completeQuestionSnapshot,
		);
	});

	test("rejects the legacy snapshot shape without selected Option data", () => {
		expect(
			questionSnapshotSchema.safeParse(legacyQuestionSnapshot).success,
		).toBe(false);
	});

	test("rejects snapshots whose options are not ordered", () => {
		expect(
			questionSnapshotSchema.safeParse(invalidQuestionSnapshot).success,
		).toBe(false);
	});

	test("rejects a selected Option whose content differs from its option entry", () => {
		const snapshot = {
			...completeQuestionSnapshot,
			selectedOption: {
				...completeQuestionSnapshot.selectedOption,
				text: "A falsified answer",
			},
		};

		expect(questionSnapshotSchema.safeParse(snapshot).success).toBe(false);
	});

	test("rejects a snapshot that does not match the Answer context", () => {
		expect(() =>
			validateQuestionSnapshotForAnswer(completeQuestionSnapshot, {
				questionId: "question-1",
				skillId: "skill-tactics",
				selectedOptionId: "option-2",
			}),
		).toThrow("QuestionSnapshot does not match the Answer context");
	});
});
