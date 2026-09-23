import Database from "better-sqlite3";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { describe, expect, test } from "vitest";
import {
	lessonAnswers,
	lessonSelectedSkills,
	lessons,
	options,
	type QuestionSnapshot,
	questions,
	relations,
	skills,
	user,
	vods,
} from "../schema";

function setupTestDb() {
	const sqlite = new Database(":memory:");
	sqlite.pragma("foreign_keys = ON");

	// Create user table for auth reference
	sqlite.exec(`
		CREATE TABLE "user" (
			"id" text PRIMARY KEY,
			"name" text NOT NULL,
			"email" text NOT NULL UNIQUE,
			"email_verified" integer DEFAULT 0 NOT NULL,
			"image" text,
			"created_at" integer NOT NULL,
			"updated_at" integer NOT NULL
		);
	`);

	// Create coaching domain tables
	sqlite.exec(`
		CREATE TABLE "skills" (
			"id" text PRIMARY KEY,
			"name" text NOT NULL,
			"slug" text NOT NULL UNIQUE,
			"created_at" integer NOT NULL,
			"updated_at" integer NOT NULL
		);

		CREATE TABLE "vods" (
			"id" text PRIMARY KEY,
			"title" text NOT NULL,
			"youtube_id" text NOT NULL,
			"is_demo" integer DEFAULT 0 NOT NULL,
			"is_published" integer DEFAULT 0 NOT NULL,
			"created_at" integer NOT NULL,
			"updated_at" integer NOT NULL
		);

		CREATE UNIQUE INDEX "vods_is_demo_unique" ON "vods" ("is_demo") WHERE "is_demo" = 1;

		CREATE TABLE "questions" (
			"id" text PRIMARY KEY,
			"vod_id" text NOT NULL REFERENCES "vods"("id") ON DELETE CASCADE,
			"skill_id" text NOT NULL REFERENCES "skills"("id") ON DELETE CASCADE,
			"timestamp_seconds" integer NOT NULL,
			"prompt" text NOT NULL,
			"created_at" integer NOT NULL,
			"updated_at" integer NOT NULL
		);

		CREATE TABLE "options" (
			"id" text PRIMARY KEY,
			"question_id" text NOT NULL REFERENCES "questions"("id") ON DELETE CASCADE,
			"text" text NOT NULL,
			"is_correct" integer DEFAULT 0 NOT NULL,
			"order_index" integer NOT NULL,
			"created_at" integer NOT NULL,
			"updated_at" integer NOT NULL
		);

		CREATE TABLE "lessons" (
			"id" text PRIMARY KEY,
			"user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
			"vod_id" text NOT NULL REFERENCES "vods"("id") ON DELETE CASCADE,
			"status" text DEFAULT 'in_progress' NOT NULL,
			"completed_at" integer,
			"created_at" integer NOT NULL,
			"updated_at" integer NOT NULL
		);

		CREATE TABLE "lesson_selected_skills" (
			"lesson_id" text NOT NULL REFERENCES "lessons"("id") ON DELETE CASCADE,
			"skill_id" text NOT NULL REFERENCES "skills"("id") ON DELETE CASCADE,
			PRIMARY KEY ("lesson_id", "skill_id")
		);

		CREATE TABLE "lesson_answers" (
			"id" text PRIMARY KEY,
			"lesson_id" text NOT NULL REFERENCES "lessons"("id") ON DELETE CASCADE,
			"question_id" text NOT NULL REFERENCES "questions"("id") ON DELETE CASCADE,
			"selected_option_id" text NOT NULL REFERENCES "options"("id") ON DELETE CASCADE,
			"is_correct" integer NOT NULL,
			"time_spent_seconds" integer,
			"question_snapshot" text NOT NULL,
			"created_at" integer NOT NULL,
			"updated_at" integer NOT NULL
		);

		CREATE UNIQUE INDEX "lesson_answers_lesson_question_idx" ON "lesson_answers" ("lesson_id", "question_id");
	`);

	const db = drizzle({ client: sqlite, relations });
	return { db, sqlite };
}

describe("Watchpoint Schema and Constraints", () => {
	test("enforces partial unique index on vods.is_demo allowing only one demo VOD", () => {
		const { db } = setupTestDb();
		const now = new Date();

		db.insert(vods)
			.values({
				id: "vod-1",
				title: "Demo VOD",
				youtubeId: "abc12345",
				isDemo: true,
				isPublished: true,
				createdAt: now,
				updatedAt: now,
			})
			.run();

		// A second demo VOD must violate the partial unique index
		expect(() =>
			db
				.insert(vods)
				.values({
					id: "vod-2",
					title: "Second Demo VOD",
					youtubeId: "def67890",
					isDemo: true,
					isPublished: true,
					createdAt: now,
					updatedAt: now,
				})
				.run(),
		).toThrow();

		// Multiple non-demo VODs are allowed
		expect(() =>
			db
				.insert(vods)
				.values({
					id: "vod-3",
					title: "Standard VOD 1",
					youtubeId: "ghi11111",
					isDemo: false,
					isPublished: true,
					createdAt: now,
					updatedAt: now,
				})
				.run(),
		).not.toThrow();

		expect(() =>
			db
				.insert(vods)
				.values({
					id: "vod-4",
					title: "Standard VOD 2",
					youtubeId: "jkl22222",
					isDemo: false,
					isPublished: true,
					createdAt: now,
					updatedAt: now,
				})
				.run(),
		).not.toThrow();
	});

	test("enforces composite unique index on lesson_answers(lesson_id, question_id)", () => {
		const { db } = setupTestDb();
		const now = new Date();

		db.insert(user)
			.values({
				id: "user-1",
				name: "Coach",
				email: "coach@example.com",
				createdAt: now,
				updatedAt: now,
			})
			.run();

		db.insert(skills)
			.values({
				id: "skill-strategy",
				name: "Strategy",
				slug: "strategy",
				createdAt: now,
				updatedAt: now,
			})
			.run();

		db.insert(vods)
			.values({
				id: "vod-1",
				title: "Strategy Session",
				youtubeId: "vid123",
				isDemo: false,
				isPublished: true,
				createdAt: now,
				updatedAt: now,
			})
			.run();

		db.insert(questions)
			.values({
				id: "q-1",
				vodId: "vod-1",
				skillId: "skill-strategy",
				timestampSeconds: 120,
				prompt: "What is the best reposition?",
				createdAt: now,
				updatedAt: now,
			})
			.run();

		db.insert(options)
			.values({
				id: "opt-1",
				questionId: "q-1",
				text: "Take high ground",
				isCorrect: true,
				orderIndex: 0,
				createdAt: now,
				updatedAt: now,
			})
			.run();

		db.insert(lessons)
			.values({
				id: "lesson-1",
				userId: "user-1",
				vodId: "vod-1",
				status: "in_progress",
				createdAt: now,
				updatedAt: now,
			})
			.run();

		db.insert(lessonSelectedSkills)
			.values({
				lessonId: "lesson-1",
				skillId: "skill-strategy",
			})
			.run();

		expect(() =>
			db
				.insert(lessonSelectedSkills)
				.values({
					lessonId: "lesson-1",
					skillId: "skill-strategy",
				})
				.run(),
		).toThrow();

		const snapshot: QuestionSnapshot = {
			prompt: "What is the best reposition?",
			timestampSeconds: 120,
			options: [{ id: "opt-1", text: "Take high ground", orderIndex: 0 }],
		};

		db.insert(lessonAnswers)
			.values({
				id: "ans-1",
				lessonId: "lesson-1",
				questionId: "q-1",
				selectedOptionId: "opt-1",
				isCorrect: true,
				timeSpentSeconds: 8,
				questionSnapshot: snapshot,
				createdAt: now,
				updatedAt: now,
			})
			.run();

		// Submitting an answer for the same question in the same lesson must throw
		expect(() =>
			db
				.insert(lessonAnswers)
				.values({
					id: "ans-2",
					lessonId: "lesson-1",
					questionId: "q-1",
					selectedOptionId: "opt-1",
					isCorrect: true,
					timeSpentSeconds: 10,
					questionSnapshot: snapshot,
					createdAt: now,
					updatedAt: now,
				})
				.run(),
		).toThrow();
	});

	test("cascades deletes from vod to questions and options", () => {
		const { db } = setupTestDb();
		const now = new Date();

		db.insert(skills)
			.values({
				id: "skill-tactics",
				name: "Tactics",
				slug: "tactics",
				createdAt: now,
				updatedAt: now,
			})
			.run();

		db.insert(vods)
			.values({
				id: "vod-cascade",
				title: "Cascade Test",
				youtubeId: "cas123",
				createdAt: now,
				updatedAt: now,
			})
			.run();

		db.insert(questions)
			.values({
				id: "q-cas",
				vodId: "vod-cascade",
				skillId: "skill-tactics",
				timestampSeconds: 30,
				prompt: "When to push?",
				createdAt: now,
				updatedAt: now,
			})
			.run();

		db.insert(options)
			.values({
				id: "opt-cas",
				questionId: "q-cas",
				text: "Immediately",
				isCorrect: true,
				orderIndex: 0,
				createdAt: now,
				updatedAt: now,
			})
			.run();

		db.delete(vods).where(sql`${vods.id} = 'vod-cascade'`).run();

		const remainingQuestions = db.select().from(questions).all();
		const remainingOptions = db.select().from(options).all();

		expect(remainingQuestions).toHaveLength(0);
		expect(remainingOptions).toHaveLength(0);
	});

	test("serializes and deserializes question_snapshot JSON correctly", () => {
		const { db } = setupTestDb();
		const now = new Date();

		db.insert(user)
			.values({
				id: "user-snap",
				name: "Snap Tester",
				email: "snap@example.com",
				createdAt: now,
				updatedAt: now,
			})
			.run();

		db.insert(skills)
			.values({
				id: "skill-snap",
				name: "Spatial",
				slug: "spatial",
				createdAt: now,
				updatedAt: now,
			})
			.run();

		db.insert(vods)
			.values({
				id: "vod-snap",
				title: "Spatial Map",
				youtubeId: "map123",
				createdAt: now,
				updatedAt: now,
			})
			.run();

		db.insert(questions)
			.values({
				id: "q-snap",
				vodId: "vod-snap",
				skillId: "skill-snap",
				timestampSeconds: 45,
				prompt: "Check flank angle?",
				createdAt: now,
				updatedAt: now,
			})
			.run();

		db.insert(options)
			.values({
				id: "opt-snap-1",
				questionId: "q-snap",
				text: "Hold choke",
				isCorrect: false,
				orderIndex: 0,
				createdAt: now,
				updatedAt: now,
			})
			.run();

		db.insert(options)
			.values({
				id: "opt-snap-2",
				questionId: "q-snap",
				text: "Check high ledge",
				isCorrect: true,
				orderIndex: 1,
				createdAt: now,
				updatedAt: now,
			})
			.run();

		db.insert(lessons)
			.values({
				id: "lesson-snap",
				userId: "user-snap",
				vodId: "vod-snap",
				status: "in_progress",
				createdAt: now,
				updatedAt: now,
			})
			.run();

		const snapshot: QuestionSnapshot = {
			prompt: "Check flank angle?",
			timestampSeconds: 45,
			options: [
				{ id: "opt-snap-1", text: "Hold choke", orderIndex: 0 },
				{ id: "opt-snap-2", text: "Check high ledge", orderIndex: 1 },
			],
		};

		db.insert(lessonAnswers)
			.values({
				id: "ans-snap",
				lessonId: "lesson-snap",
				questionId: "q-snap",
				selectedOptionId: "opt-snap-2",
				isCorrect: true,
				timeSpentSeconds: 5,
				questionSnapshot: snapshot,
				createdAt: now,
				updatedAt: now,
			})
			.run();

		const [retrieved] = db
			.select()
			.from(lessonAnswers)
			.where(sql`${lessonAnswers.id} = 'ans-snap'`)
			.all();

		expect(retrieved?.questionSnapshot).toEqual(snapshot);
		expect(retrieved?.questionSnapshot.options).toHaveLength(2);
		expect(retrieved?.questionSnapshot.options[1]?.text).toBe(
			"Check high ledge",
		);
	});

	test("supports relational queries via RQB v2 defineRelations", async () => {
		const { db } = setupTestDb();
		const now = new Date();

		db.insert(skills)
			.values({
				id: "skill-tracking",
				name: "Tracking",
				slug: "tracking",
				createdAt: now,
				updatedAt: now,
			})
			.run();

		db.insert(vods)
			.values({
				id: "vod-rqb",
				title: "Tracking Drill VOD",
				youtubeId: "track123",
				createdAt: now,
				updatedAt: now,
			})
			.run();

		db.insert(questions)
			.values({
				id: "q-rqb",
				vodId: "vod-rqb",
				skillId: "skill-tracking",
				timestampSeconds: 60,
				prompt: "Maintain crosshair on target",
				createdAt: now,
				updatedAt: now,
			})
			.run();

		db.insert(options)
			.values({
				id: "opt-rqb",
				questionId: "q-rqb",
				text: "Smooth track",
				isCorrect: true,
				orderIndex: 0,
				createdAt: now,
				updatedAt: now,
			})
			.run();

		const result = await db.query.questions.findFirst({
			where: { id: "q-rqb" },
			with: {
				vod: true,
				skill: true,
				options: true,
			},
		});

		expect(result).toBeDefined();
		expect(result?.vod?.title).toBe("Tracking Drill VOD");
		expect(result?.skill?.name).toBe("Tracking");
		expect(result?.options).toHaveLength(1);
		expect(result?.options?.[0]?.text).toBe("Smooth track");
	});
});
