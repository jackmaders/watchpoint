import { sql } from "drizzle-orm";
import {
	index,
	integer,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const vods = sqliteTable(
	"vods",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		title: text("title").notNull(),
		youtubeId: text("youtube_id").notNull(),
		durationSeconds: integer("duration_seconds").default(1).notNull(),
		isDemo: integer("is_demo", { mode: "boolean" }).default(false).notNull(),
		isPublished: integer("is_published", { mode: "boolean" })
			.default(false)
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
		uniqueIndex("vods_is_demo_unique")
			.on(table.isDemo)
			.where(sql`${table.isDemo} = 1`),
		index("vods_youtube_id_idx").on(table.youtubeId),
	],
);

export type Vod = typeof vods.$inferSelect;
export type NewVod = typeof vods.$inferInsert;
