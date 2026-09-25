import { beforeEach, describe, expect, test, vi } from "vitest";
import { lessonAnswers, lessons } from "@/shared/db";
import { createLessonOperations } from "../index.server";
import {
	createTestDatabase,
	seedCatalog,
	snapshot,
	strategySkillId,
	tacticsSkillId,
	userId,
	vodId,
} from "./lesson-test-database";

vi.mock("@/shared/db/index.server", () => ({
	getDb: vi.fn(),
}));

describe("import demo Lesson operation", () => {
	let testDatabase: ReturnType<typeof createTestDatabase>;
	let operations: ReturnType<typeof createLessonOperations>;

	beforeEach(() => {
		testDatabase = createTestDatabase();
		seedCatalog(testDatabase.database);
		operations = createLessonOperations(testDatabase.database);
	});

	test("imports a completed demo Lesson and all Answers in one batch", async () => {
		const result = await operations.lessonDemoImportOperation({
			answers: [
				{
					questionId: "question-1",
					selectedOptionId: "option-1-correct",
					snapshot: snapshot("What is the best move?", "option-1-correct"),
				},
				{
					questionId: "question-2",
					selectedOptionId: "option-2-wrong",
					snapshot: snapshot("What happens next?", "option-2-wrong"),
				},
			],
			selectedSkillIds: [strategySkillId, tacticsSkillId],
			userId,
			vodId,
		});

		expect(result).toMatchObject({ score: 1, totalQuestions: 2 });
		expect(testDatabase.batchCallCount()).toBe(1);
		expect(testDatabase.database.select().from(lessons).all()).toMatchObject([
			{ status: "completed" },
		]);
		expect(
			testDatabase.database.select().from(lessonAnswers).all(),
		).toHaveLength(2);
	});
});
