import { beforeEach, describe, expect, test, vi } from "vitest";
import { lessonAnswers } from "@/shared/db";
import { createLessonOperations } from "../index.server";
import {
	createTestDatabase,
	seedCatalog,
	snapshot,
	strategySkillId,
	userId,
	vodId,
} from "./lesson-test-database";

vi.mock("@/shared/db/index.server", () => ({
	getDb: vi.fn(),
}));

describe("submit Lesson Answer operation", () => {
	let testDatabase: ReturnType<typeof createTestDatabase>;
	let operations: ReturnType<typeof createLessonOperations>;

	beforeEach(() => {
		testDatabase = createTestDatabase();
		seedCatalog(testDatabase.database);
		operations = createLessonOperations(testDatabase.database);
	});

	test("stores one Answer and returns the existing record for a duplicate", async () => {
		const { lessonId } = await operations.lessonStartOperation({
			selectedSkillIds: [strategySkillId],
			userId,
			vodId,
		});
		const input = {
			lessonId,
			questionId: "question-1",
			selectedOptionId: "option-1-correct",
			snapshot: snapshot("What is the best move?", "option-1-correct"),
			userId,
		};

		const first = await operations.lessonAnswerSubmitOperation(input);
		const duplicate = await operations.lessonAnswerSubmitOperation({
			...input,
			selectedOptionId: "option-1-wrong",
		});

		expect(first).toMatchObject({ isCorrect: true, alreadySubmitted: false });
		expect(duplicate).toEqual({
			answerId: first.answerId,
			isCorrect: true,
			alreadySubmitted: true,
		});
		expect(
			testDatabase.database.select().from(lessonAnswers).all(),
		).toHaveLength(1);
		expect(
			(await testDatabase.database.select().from(lessonAnswers).all())[0]
				?.questionSnapshot,
		).toEqual(input.snapshot);
	});
});
