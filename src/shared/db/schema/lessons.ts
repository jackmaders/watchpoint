import { sql } from "drizzle-orm";
import {
	index,
	integer,
	primaryKey,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { user } from "./auth";
import type { Option } from "./options";
import { options } from "./options";
import type { Question } from "./questions";
import { questions } from "./questions";
import { skills } from "./skills";
import { vods } from "./vods";

export interface QuestionSnapshot {
	options: Array<Pick<Option, "id" | "orderIndex" | "text">>;
	prompt: Question["prompt"];
	timestampSeconds: Question["timestampSeconds"];
}

export const lessons = sqliteTable(
	"lessons",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		vodId: text("vod_id")
			.notNull()
			.references(() => vods.id, { onDelete: "cascade" }),
		status: text("status", { enum: ["in_progress", "completed", "abandoned"] })
			.default("in_progress")
			.notNull(),
		completedAt: integer("completed_at", { mode: "timestamp_ms" }),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("lessons_user_id_idx").on(table.userId),
		index("lessons_vod_id_idx").on(table.vodId),
	],
);

export const lessonSelectedSkills = sqliteTable(
	"lesson_selected_skills",
	{
		lessonId: text("lesson_id")
			.notNull()
			.references(() => lessons.id, { onDelete: "cascade" }),
		skillId: text("skill_id")
			.notNull()
			.references(() => skills.id, { onDelete: "cascade" }),
	},
	(table) => [
		primaryKey({ columns: [table.lessonId, table.skillId] }),
		index("lesson_selected_skills_lesson_id_idx").on(table.lessonId),
		index("lesson_selected_skills_skill_id_idx").on(table.skillId),
	],
);

export const lessonAnswers = sqliteTable(
	"lesson_answers",
	{
		id: text("id").primaryKey(),
		lessonId: text("lesson_id")
			.notNull()
			.references(() => lessons.id, { onDelete: "cascade" }),
		questionId: text("question_id")
			.notNull()
			.references(() => questions.id, { onDelete: "cascade" }),
		selectedOptionId: text("selected_option_id")
			.notNull()
			.references(() => options.id, { onDelete: "cascade" }),
		isCorrect: integer("is_correct", { mode: "boolean" }).notNull(),
		timeSpentSeconds: integer("time_spent_seconds"),
		questionSnapshot: text("question_snapshot", { mode: "json" })
			.$type<QuestionSnapshot>()
			.notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("lesson_answers_lesson_question_idx").on(
			table.lessonId,
			table.questionId,
		),
		index("lesson_answers_lesson_id_idx").on(table.lessonId),
		index("lesson_answers_question_id_idx").on(table.questionId),
	],
);

export type Lesson = typeof lessons.$inferSelect;
export type NewLesson = typeof lessons.$inferInsert;

export type LessonSelectedSkill = typeof lessonSelectedSkills.$inferSelect;
export type NewLessonSelectedSkill = typeof lessonSelectedSkills.$inferInsert;

export type LessonAnswer = typeof lessonAnswers.$inferSelect;
export type NewLessonAnswer = typeof lessonAnswers.$inferInsert;
