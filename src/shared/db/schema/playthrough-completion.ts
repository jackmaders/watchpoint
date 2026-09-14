/**
 * Defines database schema, indexes, and type definitions for playthrough completion records.
 *
 * Implements the completion tracking schema for ADR-0007, ADR-0009, and ADR-0010. Configures
 * Drizzle ORM table for `playthroughCompletions` with unique playthrough constraints and user completion indexes.
 */

import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { playthroughs } from "./playthrough";
import { users } from "./user";

export const playthroughCompletions = sqliteTable(
	"playthrough_completion",
	{
		completedAt: integer("completed_at", { mode: "timestamp" })
			.notNull()
			.$defaultFn(() => new Date()),
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		playthroughId: text("playthrough_id")
			.notNull()
			.references(() => playthroughs.id, { onDelete: "cascade" })
			.unique(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
	},
	(table) => ({
		userCompletedAtIdx: index(
			"playthrough_completion_user_completed_at_idx",
		).on(table.userId, table.completedAt),
	}),
);
