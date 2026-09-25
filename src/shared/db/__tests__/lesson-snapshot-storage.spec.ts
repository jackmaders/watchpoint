import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";

describe("lesson Answer snapshot storage", () => {
	test("preserves the detached snapshot when its live Question is deleted", () => {
		const db = new Database(":memory:");
		try {
			db.pragma("foreign_keys = ON");

			const migrationsPath = join(process.cwd(), "drizzle");
			const migrationFiles = readdirSync(migrationsPath)
				.sort()
				.map((migration) => join(migrationsPath, migration, "migration.sql"));
			const snapshotMigration = migrationFiles.pop();
			if (!snapshotMigration) {
				throw new Error(
					"Expected a migration for the QuestionSnapshot contract",
				);
			}

			for (const migrationFile of migrationFiles) {
				db.exec(readFileSync(migrationFile, "utf8"));
			}

			db.prepare("INSERT INTO user (id, name, email) VALUES (?, ?, ?)").run(
				"user-1",
				"User",
				"user@example.test",
			);
			db.prepare(
				"INSERT INTO vods (id, title, youtube_id) VALUES (?, ?, ?)",
			).run("vod-1", "Lesson", "youtube-1");
			db.prepare("INSERT INTO skills (id, name, slug) VALUES (?, ?, ?)").run(
				"skill-1",
				"Skill",
				"skill",
			);
			db.prepare(
				"INSERT INTO questions (id, vod_id, skill_id, timestamp_seconds, prompt) VALUES (?, ?, ?, ?, ?)",
			).run("question-1", "vod-1", "skill-1", 0, "Question?");
			db.prepare(
				"INSERT INTO options (id, question_id, text, order_index) VALUES (?, ?, ?, ?)",
			).run("option-1", "question-1", "Answer", 0);
			db.prepare(
				"INSERT INTO lessons (id, user_id, vod_id) VALUES (?, ?, ?)",
			).run("lesson-1", "user-1", "vod-1");

			const snapshot = JSON.stringify({
				questionId: "question-1",
				prompt: "Question?",
				options: [{ id: "option-1", text: "Answer", orderIndex: 0 }],
			});
			db.prepare(
				"INSERT INTO lesson_answers (id, lesson_id, question_id, selected_option_id, is_correct, question_snapshot) VALUES (?, ?, ?, ?, ?, ?)",
			).run("answer-1", "lesson-1", "question-1", "option-1", 1, snapshot);
			db.exec(readFileSync(snapshotMigration, "utf8"));

			db.prepare("DELETE FROM questions WHERE id = ?").run("question-1");

			expect(
				db
					.prepare("SELECT question_snapshot FROM lesson_answers WHERE id = ?")
					.pluck()
					.get("answer-1"),
			).toBe(snapshot);
			expect(
				db.prepare("SELECT id FROM options WHERE id = ?").get("option-1"),
			).toBeUndefined();
		} finally {
			db.close();
		}
	});
});
