import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { options, questions, skills, user, vods } from "@/shared/db";
import { relations } from "@/shared/db/schema/relations";
import type { createLessonOperations } from "../index.server";

export const userId = "user-1";
export const vodId = "vod-1";
export const strategySkillId = "skill-strategy";
export const tacticsSkillId = "skill-tactics";

export function snapshot(prompt: string, optionId: string) {
	return {
		options: [
			{ id: optionId, orderIndex: 0, text: "Correct answer" },
			{ id: `${optionId}-wrong`, orderIndex: 1, text: "Wrong answer" },
		],
		prompt,
		timestampSeconds: 10,
	};
}

export function createTestDatabase() {
	const sqlite = new Database(":memory:");
	sqlite.pragma("foreign_keys = ON");
	sqlite.exec(`
		CREATE TABLE "user" (
			"id" text PRIMARY KEY,
			"name" text NOT NULL,
			"email" text NOT NULL UNIQUE,
			"email_verified" integer DEFAULT 0 NOT NULL,
			"image" text,
			"role" text DEFAULT 'user' NOT NULL,
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
			"selected_option_id" text NOT NULL REFERENCES "options"("id") ON DELETE RESTRICT,
			"is_correct" integer NOT NULL,
			"time_spent_seconds" integer,
			"question_snapshot" text NOT NULL,
			"created_at" integer NOT NULL,
			"updated_at" integer NOT NULL,
			UNIQUE ("lesson_id", "question_id")
		);
	`);

	const database = drizzle({ client: sqlite, relations });
	const testDatabase = database as unknown as NonNullable<
		Parameters<typeof createLessonOperations>[0]
	>;

	let batchCalls = 0;
	Object.assign(testDatabase, {
		batch: async (statements: readonly unknown[]) => {
			batchCalls += 1;
			sqlite.transaction(() => {
				for (const statement of statements) {
					if (
						!statement ||
						typeof statement !== "object" ||
						!("run" in statement) ||
						typeof statement.run !== "function"
					) {
						throw new Error("Test statement is not executable");
					}
					statement.run();
				}
			})();
			return [];
		},
	});

	return {
		batchCallCount: () => batchCalls,
		database: testDatabase,
		sqlite,
	};
}
export function seedCatalog(
	database: ReturnType<typeof createTestDatabase>["database"],
) {
	const now = new Date(0);
	database
		.insert(user)
		.values({
			id: userId,
			name: "Learner",
			email: "learner@example.com",
			createdAt: now,
			updatedAt: now,
		})
		.run();
	database
		.insert(skills)
		.values([
			{
				id: strategySkillId,
				name: "Strategy",
				slug: "strategy",
				createdAt: now,
				updatedAt: now,
			},
			{
				id: tacticsSkillId,
				name: "Tactics",
				slug: "tactics",
				createdAt: now,
				updatedAt: now,
			},
		])
		.run();
	database
		.insert(vods)
		.values({
			id: vodId,
			title: "Demo VOD",
			youtubeId: "youtube-1",
			isDemo: true,
			isPublished: true,
			createdAt: now,
			updatedAt: now,
		})
		.run();
	database
		.insert(questions)
		.values([
			{
				id: "question-1",
				vodId,
				skillId: strategySkillId,
				timestampSeconds: 10,
				prompt: "What is the best move?",
				createdAt: now,
				updatedAt: now,
			},
			{
				id: "question-2",
				vodId,
				skillId: tacticsSkillId,
				timestampSeconds: 20,
				prompt: "What happens next?",
				createdAt: now,
				updatedAt: now,
			},
		])
		.run();
	database
		.insert(options)
		.values([
			{
				id: "option-1-correct",
				questionId: "question-1",
				text: "Correct answer",
				isCorrect: true,
				orderIndex: 0,
				createdAt: now,
				updatedAt: now,
			},
			{
				id: "option-1-wrong",
				questionId: "question-1",
				text: "Wrong answer",
				isCorrect: false,
				orderIndex: 1,
				createdAt: now,
				updatedAt: now,
			},
			{
				id: "option-2-correct",
				questionId: "question-2",
				text: "Correct answer",
				isCorrect: true,
				orderIndex: 0,
				createdAt: now,
				updatedAt: now,
			},
			{
				id: "option-2-wrong",
				questionId: "question-2",
				text: "Wrong answer",
				isCorrect: false,
				orderIndex: 1,
				createdAt: now,
				updatedAt: now,
			},
		])
		.run();
}
