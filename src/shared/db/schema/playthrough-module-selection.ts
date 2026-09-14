/**
 * Defines database schema and compound primary key for playthrough module selection filters.
 *
 * Implements the scenario module filtering configuration for ADR-0007, ADR-0009, and ADR-0010. Configures
 * Drizzle ORM table for `playthroughModuleSelections` mapping playthrough IDs to active module types.
 */

import { primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { playthroughs } from "./playthrough";
import { moduleTypeEnum } from "./scenario";

export const playthroughModuleSelections = sqliteTable(
	"playthrough_module_selection",
	{
		moduleType: text("module_type", { enum: moduleTypeEnum }).notNull(),
		playthroughId: text("playthrough_id")
			.notNull()
			.references(() => playthroughs.id, { onDelete: "cascade" }),
	},
	(table) => ({
		primaryKey: primaryKey({
			columns: [table.playthroughId, table.moduleType],
		}),
	}),
);
