import { beforeEach, describe, expect, test, vi } from "vitest";
import { lessonSelectedSkills, lessons } from "@/shared/db";
import { createLessonOperations } from "../index.server";
import {
	createTestDatabase,
	seedCatalog,
	strategySkillId,
	userId,
	vodId,
} from "./lesson-test-database";

vi.mock("@/shared/db/index.server", () => ({
	getDb: vi.fn(),
}));

describe("start Lesson operation", () => {
	let testDatabase: ReturnType<typeof createTestDatabase>;
	let operations: ReturnType<typeof createLessonOperations>;

	beforeEach(() => {
		testDatabase = createTestDatabase();
		seedCatalog(testDatabase.database);
		operations = createLessonOperations(testDatabase.database);
	});

	test("starts an in-progress Lesson with its selected Skills", async () => {
		const result = await operations.lessonStartOperation({
			selectedSkillIds: [strategySkillId],
			userId,
			vodId,
		});

		expect(result.lessonId).toEqual(expect.any(String));
		expect(
			testDatabase.database
				.select({ status: lessons.status })
				.from(lessons)
				.all(),
		).toEqual([{ status: "in_progress" }]);
		expect(
			testDatabase.database
				.select({ skillId: lessonSelectedSkills.skillId })
				.from(lessonSelectedSkills)
				.all(),
		).toEqual([{ skillId: strategySkillId }]);
		expect(testDatabase.batchCallCount()).toBe(1);
	});
});
