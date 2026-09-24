import { describe, expect, test } from "vitest";
import {
	parseQuestionSnapshot,
	questionSnapshotSchema,
	validateQuestionSnapshotForAnswer,
} from "@/entities/lesson";
import {
	completeQuestionSnapshot,
	invalidQuestionSnapshot,
	legacyQuestionSnapshot,
} from "../__fixtures__/question-snapshots";

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
