/**
 * Defines database schema, status enumeration, indexes, and type definitions for interactive playthrough sessions.
 *
 * Implements the session coordination schema for ADR-0007, ADR-0009, and ADR-0010. Configures
 * Drizzle ORM table for `playthroughs` with foreign key cascades to `users` and `vods`, tracking lifecycle state
 * and creation/completion timestamps.
 */

import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "./user";
import { vods } from "./vod";

export const playthroughStatusEnum = ["IN_PROGRESS", "COMPLETED"] as const;
export type PlaythroughStatus = (typeof playthroughStatusEnum)[number];

export const playthroughs = sqliteTable(
	"playthrough",
	{
		completedAt: integer("completed_at", { mode: "timestamp" }),
		createdAt: integer("created_at", { mode: "timestamp" })
			.notNull()
			.$defaultFn(() => new Date()),
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		status: text("status", { enum: playthroughStatusEnum })
			.notNull()
			.default("IN_PROGRESS"),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		vodId: text("vod_id")
			.notNull()
			.references(() => vods.id, { onDelete: "cascade" }),
	},
	(table) => ({
		userCreatedAtIdx: index("playthrough_user_created_at_idx").on(
			table.userId,
			table.createdAt,
		),
		vodIdx: index("playthrough_vod_idx").on(table.vodId),
	}),
);
