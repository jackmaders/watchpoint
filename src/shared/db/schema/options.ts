import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { questions } from "./questions";

export const options = sqliteTable(
	"options",
	{
		id: text("id").primaryKey(),
		questionId: text("question_id")
			.notNull()
			.references(() => questions.id, { onDelete: "cascade" }),
		text: text("text").notNull(),
		isCorrect: integer("is_correct", { mode: "boolean" })
			.default(false)
			.notNull(),
		orderIndex: integer("order_index").notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("options_question_id_idx").on(table.questionId),
		index("options_question_order_idx").on(table.questionId, table.orderIndex),
	],
);

export type Option = typeof options.$inferSelect;
export type NewOption = typeof options.$inferInsert;
