/**
 * Defines database schema, indexes, and type definitions for immutable scenario snapshots within a playthrough.
 *
 * Implements the point-in-time scenario freezing schema for ADR-0007, ADR-0009, and ADR-0010. Configures
 * Drizzle ORM table for `scenarioSnapshots` preserving scenario prompt, configuration, and ordering at playthrough initiation.
 */

import {
	index,
	integer,
	real,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";
import type { JsonValue } from "../core/types";
import { playthroughs } from "./playthrough";
import { inputTypeEnum, moduleTypeEnum } from "./scenario";

export const scenarioSnapshots = sqliteTable(
	"scenario_snapshot",
	{
		explanationText: text("explanation_text").notNull(),
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		imageUrl: text("image_url"),
		inputConfig: text("input_config", { mode: "json" })
			.$type<Record<string, JsonValue>>()
			.notNull(),
		inputType: text("input_type", { enum: inputTypeEnum }).notNull(),
		moduleType: text("module_type", { enum: moduleTypeEnum }).notNull(),
		playthroughId: text("playthrough_id")
			.notNull()
			.references(() => playthroughs.id, { onDelete: "cascade" }),
		position: integer("position").notNull(),
		promptText: text("prompt_text").notNull(),
		scenarioId: text("scenario_id").notNull(),
		timeLimitSeconds: integer("time_limit_seconds"),
		timestampSeconds: real("timestamp_seconds").notNull(),
	},
	(table) => ({
		playthroughPositionIdx: uniqueIndex(
			"scenario_snapshot_playthrough_position_idx",
		).on(table.playthroughId, table.position),
		playthroughScenarioIdx: index(
			"scenario_snapshot_playthrough_scenario_idx",
		).on(table.playthroughId, table.scenarioId),
	}),
);
