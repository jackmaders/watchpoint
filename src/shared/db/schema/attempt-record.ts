/**
 * Defines database schema, indexes, and type definitions for player attempt telemetry records.
 *
 * Implements the telemetry recording schema for ADR-0007, ADR-0009, and ADR-0010. Configures
 * Drizzle ORM table for `attemptRecords` capturing response times, evaluation results, selected options, and input values with idempotency support.
 */

import {
	index,
	integer,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";
import type { JsonValue } from "../core/types";
import { playthroughs } from "./playthrough";
import { scenarios } from "./scenario";
import { scenarioSnapshots } from "./scenario-snapshot";
import { users } from "./user";

export const attemptRecords = sqliteTable(
	"attempt_record",
	{
		createdAt: integer("created_at", { mode: "timestamp" })
			.notNull()
			.$defaultFn(() => new Date()),
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		idempotencyKey: text("idempotency_key").unique(),
		inputValue: text("input_value", { mode: "json" }).$type<
			Record<string, JsonValue>
		>(),
		isCorrect: integer("is_correct", { mode: "boolean" }).notNull(),
		isTimedOut: integer("is_timed_out", { mode: "boolean" })
			.notNull()
			.default(false),
		playthroughId: text("playthrough_id").references(() => playthroughs.id, {
			onDelete: "cascade",
		}),
		responseTimeMs: integer("response_time_ms").notNull(),
		scenarioId: text("scenario_id").references(() => scenarios.id, {
			onDelete: "set null",
		}),
		scenarioSnapshotId: text("scenario_snapshot_id").references(
			() => scenarioSnapshots.id,
			{ onDelete: "cascade" },
		),
		selectedOptionId: text("selected_option_id"),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
	},
	(table) => ({
		playthroughIdx: index("attempt_record_playthrough_idx").on(
			table.playthroughId,
			table.createdAt,
		),
		playthroughSnapshotIdx: uniqueIndex(
			"attempt_record_playthrough_snapshot_idx",
		).on(table.playthroughId, table.scenarioSnapshotId),
		userIdx: index("attempt_record_user_idx").on(table.userId, table.createdAt),
	}),
);
