import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { lessons } from "@/shared/db";
import { createLessonOperations } from "../index.server";
import {
	LessonConflictError,
	LessonValidationError,
} from "../model/lesson-errors";
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

describe("complete Lesson operation", () => {
	let testDatabase: ReturnType<typeof createTestDatabase>;
	let operations: ReturnType<typeof createLessonOperations>;

	beforeEach(() => {
		testDatabase = createTestDatabase();
		seedCatalog(testDatabase.database);
		operations = createLessonOperations(testDatabase.database);
	});

	test("rejects completion until every selected-Skill Question has an Answer", async () => {
		const { lessonId } = await operations.lessonStartOperation({
			selectedSkillIds: [strategySkillId, tacticsSkillId],
			userId,
			vodId,
		});
		await operations.lessonAnswerSubmitOperation({
			lessonId,
			questionId: "question-1",
			selectedOptionId: "option-1-correct",
			snapshot: snapshot("What is the best move?", "option-1-correct"),
			userId,
		});

		await expect(
			operations.lessonCompleteOperation({ lessonId, userId }),
		).rejects.toBeInstanceOf(LessonValidationError);
	});

	test("completes a Lesson with a score and makes completion idempotent", async () => {
		const { lessonId } = await operations.lessonStartOperation({
			selectedSkillIds: [strategySkillId, tacticsSkillId],
			userId,
			vodId,
		});
		await operations.lessonAnswerSubmitOperation({
			lessonId,
			questionId: "question-1",
			selectedOptionId: "option-1-correct",
			snapshot: snapshot("What is the best move?", "option-1-correct"),
			userId,
		});
		await operations.lessonAnswerSubmitOperation({
			lessonId,
			questionId: "question-2",
			selectedOptionId: "option-2-wrong",
			snapshot: snapshot("What happens next?", "option-2-wrong"),
			userId,
		});

		const completed = await operations.lessonCompleteOperation({
			lessonId,
			userId,
		});
		const repeated = await operations.lessonCompleteOperation({
			lessonId,
			userId,
		});

		expect(completed).toMatchObject({ lessonId, score: 1, totalQuestions: 2 });
		expect(repeated).toEqual(completed);
	});

	test("does not expose another user's Lesson", async () => {
		const { lessonId } = await operations.lessonStartOperation({
			selectedSkillIds: [strategySkillId],
			userId,
			vodId,
		});

		await expect(
			operations.lessonCompleteOperation({ lessonId, userId: "other-user" }),
		).rejects.toMatchObject({ status: 404 });
	});

	test("rejects completion after a Lesson is already abandoned", async () => {
		const { lessonId } = await operations.lessonStartOperation({
			selectedSkillIds: [strategySkillId],
			userId,
			vodId,
		});
		testDatabase.database
			.update(lessons)
			.set({ status: "abandoned" })
			.where(eq(lessons.id, lessonId))
			.run();

		await expect(
			operations.lessonCompleteOperation({ lessonId, userId }),
		).rejects.toBeInstanceOf(LessonConflictError);
	});
});
