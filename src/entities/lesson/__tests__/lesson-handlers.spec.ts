import Database from "better-sqlite3";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { afterEach, describe, expect, test, vi } from "vitest";
import { relations } from "@/shared/db";
import {
	completeLessonHandler,
	startLessonHandler,
	submitLessonAnswerHandler,
} from "../api/lesson-handlers";

vi.mock("@/shared/db/index.server", () => ({ getDb: vi.fn() }));

const databases: Database.Database[] = [];

afterEach(() => {
	for (const database of databases.splice(0)) {
		database.close();
	}
});

describe("startLessonHandler", () => {
	test("creates an in-progress lesson with selected skills for a published VOD", async () => {
		const db = createDatabase();
		insertUser(db, "user-1");
		insertVod(db, { id: "vod-1", isPublished: 1 });
		insertSkill(db, "skill-strategy", "Strategy");
		insertSkill(db, "skill-tactics", "Tactics");
		insertQuestion(db, "q-1", "vod-1", "skill-strategy");
		insertQuestion(db, "q-2", "vod-1", "skill-tactics");

		const result = await startLessonHandler(
			{
				vodId: "vod-1",
				selectedSkillIds: ["skill-strategy"],
				userId: "user-1",
			},
			// biome-ignore lint/nursery/noUnsafeTypeAssertion: test uses in-memory SQLite driver
			db as never,
		);

		expect(result).toBeDefined();
		expect(result).toMatchObject({
			userId: "user-1",
			vodId: "vod-1",
			status: "in_progress",
			completedAt: null,
		});
		expect(typeof result?.id).toBe("string");

		// In better-sqlite3 with drizzle, let's query directly
		const rows = db.all(
			sql`SELECT skill_id as skillId FROM lesson_selected_skills WHERE lesson_id = ${result?.id}`,
		);
		expect(rows).toEqual([{ skillId: "skill-strategy" }]);
	});

	test("throws 404 ServerFunctionError if VOD does not exist", async () => {
		const db = createDatabase();
		insertUser(db, "user-1");

		await expect(
			startLessonHandler(
				{
					vodId: "nonexistent",
					selectedSkillIds: [],
					userId: "user-1",
				},
				// biome-ignore lint/nursery/noUnsafeTypeAssertion: test uses in-memory SQLite driver
				db as never,
			),
		).rejects.toMatchObject({
			status: 404,
			message: "Published VOD not found",
		});
	});

	test("throws 404 ServerFunctionError if VOD is not published", async () => {
		const db = createDatabase();
		insertUser(db, "user-1");
		insertVod(db, { id: "vod-unpublished", isPublished: 0 });

		await expect(
			startLessonHandler(
				{
					vodId: "vod-unpublished",
					selectedSkillIds: [],
					userId: "user-1",
				},
				// biome-ignore lint/nursery/noUnsafeTypeAssertion: test uses in-memory SQLite driver
				db as never,
			),
		).rejects.toMatchObject({
			status: 404,
			message: "Published VOD not found",
		});
	});
});

describe("submitLessonAnswerHandler", () => {
	test("persists an answer with correctness, snapshot, and time spent", async () => {
		const db = createDatabase();
		insertUser(db, "user-1");
		insertVod(db, { id: "vod-1", isPublished: 1 });
		insertSkill(db, "skill-strategy", "Strategy");
		insertQuestion(db, "q-1", "vod-1", "skill-strategy");
		insertOption(db, "opt-1", "q-1", 1);
		insertOption(db, "opt-2", "q-1", 0);
		insertLesson(db, { id: "lesson-1", userId: "user-1", vodId: "vod-1" });

		const snapshot = {
			prompt: "Question",
			timestampSeconds: 10,
			options: [
				{ id: "opt-1", text: "Option 1", orderIndex: 0 },
				{ id: "opt-2", text: "Option 2", orderIndex: 1 },
			],
		};

		const result = await submitLessonAnswerHandler(
			{
				lessonId: "lesson-1",
				questionId: "q-1",
				selectedOptionId: "opt-1",
				snapshot,
				timeSpentSeconds: 5,
				userId: "user-1",
			},
			// biome-ignore lint/nursery/noUnsafeTypeAssertion: test uses in-memory SQLite driver
			db as never,
		);

		expect(result).toMatchObject({
			lessonId: "lesson-1",
			questionId: "q-1",
			selectedOptionId: "opt-1",
			isCorrect: true,
			timeSpentSeconds: 5,
			questionSnapshot: snapshot,
		});
	});

	test("returns the existing answer when duplicate answer is submitted (idempotent)", async () => {
		const db = createDatabase();
		insertUser(db, "user-1");
		insertVod(db, { id: "vod-1", isPublished: 1 });
		insertSkill(db, "skill-strategy", "Strategy");
		insertQuestion(db, "q-1", "vod-1", "skill-strategy");
		insertOption(db, "opt-1", "q-1", 1);
		insertLesson(db, { id: "lesson-1", userId: "user-1", vodId: "vod-1" });

		const snapshot = {
			prompt: "Question",
			timestampSeconds: 10,
			options: [{ id: "opt-1", text: "Option 1", orderIndex: 0 }],
		};

		const first = await submitLessonAnswerHandler(
			{
				lessonId: "lesson-1",
				questionId: "q-1",
				selectedOptionId: "opt-1",
				snapshot,
				timeSpentSeconds: 5,
				userId: "user-1",
			},
			// biome-ignore lint/nursery/noUnsafeTypeAssertion: test uses in-memory SQLite driver
			db as never,
		);

		const second = await submitLessonAnswerHandler(
			{
				lessonId: "lesson-1",
				questionId: "q-1",
				selectedOptionId: "opt-1",
				snapshot,
				timeSpentSeconds: 12,
				userId: "user-1",
			},
			// biome-ignore lint/nursery/noUnsafeTypeAssertion: test uses in-memory SQLite driver
			db as never,
		);

		expect(first).toBeDefined();
		expect(second).toBeDefined();
		expect(second?.id).toBe(first?.id);
		expect(second?.timeSpentSeconds).toBe(5);
	});

	test("throws 403 ServerFunctionError if user is not the lesson owner", async () => {
		const db = createDatabase();
		insertUser(db, "user-1");
		insertUser(db, "user-2");
		insertVod(db, { id: "vod-1", isPublished: 1 });
		insertSkill(db, "skill-strategy", "Strategy");
		insertQuestion(db, "q-1", "vod-1", "skill-strategy");
		insertOption(db, "opt-1", "q-1", 1);
		insertLesson(db, { id: "lesson-1", userId: "user-1", vodId: "vod-1" });

		const snapshot = {
			prompt: "Question",
			timestampSeconds: 10,
			options: [{ id: "opt-1", text: "Option 1", orderIndex: 0 }],
		};

		await expect(
			submitLessonAnswerHandler(
				{
					lessonId: "lesson-1",
					questionId: "q-1",
					selectedOptionId: "opt-1",
					snapshot,
					userId: "user-2",
				},
				// biome-ignore lint/nursery/noUnsafeTypeAssertion: test uses in-memory SQLite driver
				db as never,
			),
		).rejects.toMatchObject({
			status: 403,
			message: "Forbidden",
		});
	});

	test("throws 400 ServerFunctionError if lesson is not in progress", async () => {
		const db = createDatabase();
		insertUser(db, "user-1");
		insertVod(db, { id: "vod-1", isPublished: 1 });
		insertSkill(db, "skill-strategy", "Strategy");
		insertQuestion(db, "q-1", "vod-1", "skill-strategy");
		insertOption(db, "opt-1", "q-1", 1);
		insertLesson(db, {
			id: "lesson-1",
			userId: "user-1",
			vodId: "vod-1",
			status: "completed",
		});

		const snapshot = {
			prompt: "Question",
			timestampSeconds: 10,
			options: [{ id: "opt-1", text: "Option 1", orderIndex: 0 }],
		};

		await expect(
			submitLessonAnswerHandler(
				{
					lessonId: "lesson-1",
					questionId: "q-1",
					selectedOptionId: "opt-1",
					snapshot,
					userId: "user-1",
				},
				// biome-ignore lint/nursery/noUnsafeTypeAssertion: test uses in-memory SQLite driver
				db as never,
			),
		).rejects.toMatchObject({
			status: 400,
			message: "Lesson is not in progress",
		});
	});

	test("throws 404 ServerFunctionError if option does not exist for the question", async () => {
		const db = createDatabase();

		insertUser(db, "user-1");
		insertVod(db, { id: "vod-1", isPublished: 1 });
		insertSkill(db, "skill-strategy", "Strategy");
		insertQuestion(db, "q-1", "vod-1", "skill-strategy");
		insertQuestion(db, "q-2", "vod-1", "skill-strategy");
		insertOption(db, "opt-other", "q-2", 1);
		insertLesson(db, { id: "lesson-1", userId: "user-1", vodId: "vod-1" });

		const snapshot = {
			prompt: "Question",
			timestampSeconds: 10,
			options: [{ id: "opt-other", text: "Option", orderIndex: 0 }],
		};

		await expect(
			submitLessonAnswerHandler(
				{
					lessonId: "lesson-1",
					questionId: "q-1",
					selectedOptionId: "opt-other",
					snapshot,
					userId: "user-1",
				},
				// biome-ignore lint/nursery/noUnsafeTypeAssertion: test uses in-memory SQLite driver
				db as never,
			),
		).rejects.toMatchObject({
			status: 404,
			message: "Option not found for question",
		});
	});
});

describe("completeLessonHandler", () => {
	test("completes an in-progress lesson, sets completedAt, and returns summary and score", async () => {
		const db = createDatabase();
		insertUser(db, "user-1");
		insertVod(db, { id: "vod-1", isPublished: 1 });
		insertSkill(db, "skill-strategy", "Strategy");
		insertQuestion(db, "q-1", "vod-1", "skill-strategy");
		insertOption(db, "opt-1", "q-1", 1);
		insertOption(db, "opt-2", "q-1", 0);
		insertLesson(db, { id: "lesson-1", userId: "user-1", vodId: "vod-1" });

		const snapshot = {
			prompt: "Question",
			timestampSeconds: 10,
			options: [{ id: "opt-1", text: "Option 1", orderIndex: 0 }],
		};

		await submitLessonAnswerHandler(
			{
				lessonId: "lesson-1",
				questionId: "q-1",
				selectedOptionId: "opt-1",
				snapshot,
				userId: "user-1",
			},
			// biome-ignore lint/nursery/noUnsafeTypeAssertion: test uses in-memory SQLite driver
			db as never,
		);

		const result = await completeLessonHandler(
			{
				lessonId: "lesson-1",
				userId: "user-1",
			},
			// biome-ignore lint/nursery/noUnsafeTypeAssertion: test uses in-memory SQLite driver
			db as never,
		);

		expect(result.lesson).toMatchObject({
			id: "lesson-1",
			status: "completed",
		});
		expect(result.lesson.completedAt).toBeInstanceOf(Date);
		expect(result.summary).toMatchObject({
			score: {
				totalQuestionCount: 1,
				answeredQuestionCount: 1,
				correctQuestionCount: 1,
				percentage: 100,
			},
			skillSummaries: [
				{
					skillId: "skill-strategy",
					skillName: "Strategy",
					score: {
						totalQuestionCount: 1,
						answeredQuestionCount: 1,
						correctQuestionCount: 1,
						percentage: 100,
					},
				},
			],
		});
	});

	test("throws 400 ServerFunctionError if questions are unanswered", async () => {
		const db = createDatabase();
		insertUser(db, "user-1");
		insertVod(db, { id: "vod-1", isPublished: 1 });
		insertSkill(db, "skill-strategy", "Strategy");
		insertQuestion(db, "q-1", "vod-1", "skill-strategy");
		insertOption(db, "opt-1", "q-1", 1);
		insertLesson(db, { id: "lesson-1", userId: "user-1", vodId: "vod-1" });

		await expect(
			completeLessonHandler(
				{
					lessonId: "lesson-1",
					userId: "user-1",
				},
				// biome-ignore lint/nursery/noUnsafeTypeAssertion: test uses in-memory SQLite driver
				db as never,
			),
		).rejects.toMatchObject({
			status: 400,
			message: "Lesson has unanswered questions",
		});
	});

	test("throws 403 ServerFunctionError if user is not the lesson owner", async () => {
		const db = createDatabase();
		insertUser(db, "user-1");
		insertUser(db, "user-2");
		insertVod(db, { id: "vod-1", isPublished: 1 });
		insertLesson(db, { id: "lesson-1", userId: "user-1", vodId: "vod-1" });

		await expect(
			completeLessonHandler(
				{
					lessonId: "lesson-1",
					userId: "user-2",
				},
				// biome-ignore lint/nursery/noUnsafeTypeAssertion: test uses in-memory SQLite driver
				db as never,
			),
		).rejects.toMatchObject({
			status: 403,
			message: "Forbidden",
		});
	});

	test("throws 404 ServerFunctionError if lesson is not found", async () => {
		const db = createDatabase();
		insertUser(db, "user-1");

		await expect(
			completeLessonHandler(
				{
					lessonId: "nonexistent",
					userId: "user-1",
				},
				// biome-ignore lint/nursery/noUnsafeTypeAssertion: test uses in-memory SQLite driver
				db as never,
			),
		).rejects.toMatchObject({
			status: 404,
			message: "Lesson not found",
		});
	});

	test("returns existing completion summary if lesson is already completed (idempotent)", async () => {
		const db = createDatabase();
		insertUser(db, "user-1");
		insertVod(db, { id: "vod-1", isPublished: 1 });
		insertSkill(db, "skill-strategy", "Strategy");
		insertQuestion(db, "q-1", "vod-1", "skill-strategy");
		insertOption(db, "opt-1", "q-1", 1);
		insertLesson(db, { id: "lesson-1", userId: "user-1", vodId: "vod-1" });

		const snapshot = {
			prompt: "Question",
			timestampSeconds: 10,
			options: [{ id: "opt-1", text: "Option 1", orderIndex: 0 }],
		};

		await submitLessonAnswerHandler(
			{
				lessonId: "lesson-1",
				questionId: "q-1",
				selectedOptionId: "opt-1",
				snapshot,
				userId: "user-1",
			},
			// biome-ignore lint/nursery/noUnsafeTypeAssertion: test uses in-memory SQLite driver
			db as never,
		);

		const first = await completeLessonHandler(
			{ lessonId: "lesson-1", userId: "user-1" },
			// biome-ignore lint/nursery/noUnsafeTypeAssertion: test uses in-memory SQLite driver
			db as never,
		);
		const second = await completeLessonHandler(
			{ lessonId: "lesson-1", userId: "user-1" },
			// biome-ignore lint/nursery/noUnsafeTypeAssertion: test uses in-memory SQLite driver
			db as never,
		);

		expect(second.lesson.id).toBe(first.lesson.id);
		expect(second.lesson.completedAt?.getTime()).toBe(
			first.lesson.completedAt?.getTime(),
		);
		expect(second.summary).toEqual(first.summary);
	});

	test("requires only questions for selected skills to be answered when selected skills are configured", async () => {
		const db = createDatabase();
		insertUser(db, "user-1");
		insertVod(db, { id: "vod-1", isPublished: 1 });
		insertSkill(db, "skill-strategy", "Strategy");
		insertSkill(db, "skill-tactics", "Tactics");
		insertQuestion(db, "q-strat", "vod-1", "skill-strategy");
		insertQuestion(db, "q-tact", "vod-1", "skill-tactics");
		insertOption(db, "opt-strat", "q-strat", 1);
		insertOption(db, "opt-tact", "q-tact", 1);

		const createdLesson = await startLessonHandler(
			{
				vodId: "vod-1",
				selectedSkillIds: ["skill-strategy"],
				userId: "user-1",
			},
			// biome-ignore lint/nursery/noUnsafeTypeAssertion: test uses in-memory SQLite driver
			db as never,
		);

		expect(createdLesson).toBeDefined();
		if (!createdLesson) {
			throw new Error("Lesson creation failed");
		}

		const snapshot = {
			prompt: "Question",
			timestampSeconds: 10,
			options: [{ id: "opt-strat", text: "Option", orderIndex: 0 }],
		};

		await submitLessonAnswerHandler(
			{
				lessonId: createdLesson.id,
				questionId: "q-strat",
				selectedOptionId: "opt-strat",
				snapshot,
				userId: "user-1",
			},
			// biome-ignore lint/nursery/noUnsafeTypeAssertion: test uses in-memory SQLite driver
			db as never,
		);

		// Completing should succeed even though q-tact is unanswered, because only skill-strategy was selected
		const result = await completeLessonHandler(
			{ lessonId: createdLesson.id, userId: "user-1" },
			// biome-ignore lint/nursery/noUnsafeTypeAssertion: test uses in-memory SQLite driver
			db as never,
		);

		expect(result.lesson.status).toBe("completed");
		expect(result.summary.score.totalQuestionCount).toBe(1);
		expect(result.summary.score.correctQuestionCount).toBe(1);
		expect(result.summary.skillSummaries).toHaveLength(1);
		expect(result.summary.skillSummaries[0]?.skillId).toBe("skill-strategy");
	});
});

function createDatabase() {
	const database = new Database(":memory:");
	databases.push(database);
	const db = drizzle({ client: database, relations });

	db.run(sql`
		CREATE TABLE user (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			email TEXT NOT NULL UNIQUE,
			email_verified INTEGER NOT NULL DEFAULT 0,
			image TEXT,
			role TEXT NOT NULL DEFAULT 'user',
			created_at INTEGER NOT NULL DEFAULT 1,
			updated_at INTEGER NOT NULL DEFAULT 1
		)
	`);

	db.run(sql`
		CREATE TABLE vods (
			id TEXT PRIMARY KEY,
			title TEXT NOT NULL,
			youtube_id TEXT NOT NULL,
			duration_seconds INTEGER NOT NULL,
			is_demo INTEGER NOT NULL,
			is_published INTEGER NOT NULL,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		)
	`);

	db.run(sql`
		CREATE TABLE skills (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			slug TEXT NOT NULL,
			created_at INTEGER NOT NULL DEFAULT 1,
			updated_at INTEGER NOT NULL DEFAULT 1
		)
	`);

	db.run(sql`
		CREATE TABLE questions (
			id TEXT PRIMARY KEY,
			vod_id TEXT NOT NULL,
			skill_id TEXT NOT NULL,
			timestamp_seconds INTEGER NOT NULL,
			prompt TEXT NOT NULL,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		)
	`);

	db.run(sql`
		CREATE TABLE options (
			id TEXT PRIMARY KEY,
			question_id TEXT NOT NULL,
			text TEXT NOT NULL,
			is_correct INTEGER NOT NULL DEFAULT 0,
			order_index INTEGER NOT NULL,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		)
	`);

	db.run(sql`
		CREATE TABLE lessons (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL,
			vod_id TEXT NOT NULL,
			status TEXT NOT NULL DEFAULT 'in_progress',
			completed_at INTEGER,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		)
	`);

	db.run(sql`
		CREATE TABLE lesson_selected_skills (
			lesson_id TEXT NOT NULL,
			skill_id TEXT NOT NULL,
			PRIMARY KEY (lesson_id, skill_id)
		)
	`);

	db.run(sql`
		CREATE TABLE lesson_answers (
			id TEXT PRIMARY KEY,
			lesson_id TEXT NOT NULL,
			question_id TEXT NOT NULL,
			selected_option_id TEXT NOT NULL,
			is_correct INTEGER NOT NULL,
			time_spent_seconds INTEGER,
			question_snapshot TEXT NOT NULL,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL,
			UNIQUE(lesson_id, question_id)
		)
	`);

	return db;
}

function insertUser(db: ReturnType<typeof createDatabase>, id: string) {
	db.run(
		sql`INSERT INTO user (id, name, email) VALUES (${id}, 'User', ${id || "@example.com"})`,
	);
}

function insertVod(
	db: ReturnType<typeof createDatabase>,
	values: { id: string; isPublished: 0 | 1 },
) {
	db.run(
		sql`INSERT INTO vods (id, title, youtube_id, duration_seconds, is_demo, is_published, created_at, updated_at)
			VALUES (${values.id}, 'Sample VOD', 'sample-yt', 200, 0, ${values.isPublished}, 1, 1)`,
	);
}

function insertSkill(
	db: ReturnType<typeof createDatabase>,
	id: string,
	name: string,
) {
	db.run(
		sql`INSERT INTO skills (id, name, slug) VALUES (${id}, ${name}, ${id})`,
	);
}

function insertQuestion(
	db: ReturnType<typeof createDatabase>,
	id: string,
	vodId: string,
	skillId: string,
) {
	db.run(
		sql`INSERT INTO questions (id, vod_id, skill_id, timestamp_seconds, prompt, created_at, updated_at)
			VALUES (${id}, ${vodId}, ${skillId}, 10, 'Question', 1, 1)`,
	);
}

function insertOption(
	db: ReturnType<typeof createDatabase>,
	id: string,
	questionId: string,
	isCorrect: 0 | 1,
) {
	db.run(
		sql`INSERT INTO options (id, question_id, text, is_correct, order_index, created_at, updated_at)
			VALUES (${id}, ${questionId}, 'Option', ${isCorrect}, 0, 1, 1)`,
	);
}

function insertLesson(
	db: ReturnType<typeof createDatabase>,
	values: { id: string; userId: string; vodId: string; status?: string },
) {
	db.run(
		sql`INSERT INTO lessons (id, user_id, vod_id, status, created_at, updated_at)
			VALUES (${values.id}, ${values.userId}, ${values.vodId}, ${values.status ?? "in_progress"}, 1, 1)`,
	);
}
