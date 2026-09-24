import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { skills } from "./skills";
import { vods } from "./vods";

export const questions = sqliteTable(
	"questions",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		vodId: text("vod_id")
			.notNull()
			.references(() => vods.id, { onDelete: "cascade" }),
		skillId: text("skill_id")
			.notNull()
			.references(() => skills.id, { onDelete: "cascade" }),
		timestampSeconds: integer("timestamp_seconds").notNull(),
		prompt: text("prompt").notNull(),
		explanation: text("explanation").notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("questions_skill_id_idx").on(table.skillId),
		index("questions_vod_timestamp_idx").on(
			table.vodId,
			table.timestampSeconds,
		),
	],
);

export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;
