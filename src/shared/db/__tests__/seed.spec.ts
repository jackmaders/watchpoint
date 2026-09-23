import Database from "better-sqlite3";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { describe, expect, test } from "vitest";
import { options, questions, relations, skills, vods } from "../schema";
import { seed } from "../seed";

function setupTestDb() {
	const sqlite = new Database(":memory:");
	sqlite.pragma("foreign_keys = ON");

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

describe("Database Seed Seam", () => {
	test("populates baseline skills and a sample VOD with questions and options", async () => {
		const { db } = setupTestDb();

		await seed(db);

		const allSkills = db.select().from(skills).all();
		const slugs = allSkills.map((s) => s.slug).sort();
		expect(slugs).toEqual(["spatial", "strategy", "tactics", "tracking"]);

		const allVods = db.select().from(vods).all();
		expect(allVods.length).toBeGreaterThanOrEqual(1);

		const demoVod = allVods.find((v) => v.isDemo);
		expect(demoVod).toBeDefined();

		const allQuestions = db.select().from(questions).all();
		expect(allQuestions.length).toBeGreaterThanOrEqual(1);

		const allOptions = db.select().from(options).all();
		expect(allOptions.length).toBeGreaterThanOrEqual(2);
		expect(allOptions.some((o) => o.isCorrect)).toBe(true);
	});

	test("executes idempotently without duplicating or throwing on repeated runs", async () => {
		const { db } = setupTestDb();

		await seed(db);
		await expect(seed(db)).resolves.not.toThrow();

		const allSkills = db.select().from(skills).all();
		expect(allSkills).toHaveLength(4);

		const demoVods = db
			.select()
			.from(vods)
			.where(sql`${vods.isDemo} = 1`)
			.all();
		expect(demoVods).toHaveLength(1);
	});
});
