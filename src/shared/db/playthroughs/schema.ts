import { relations } from "drizzle-orm";
import {
	index,
	integer,
	primaryKey,
	real,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { users } from "../auth/schema";
import type { JsonValue } from "../common/types";
import { inputTypeEnum, moduleTypeEnum, scenarios, vods } from "../vods/schema";

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
		scenarioId: text("scenario_id")
			.notNull()
			.references(() => scenarios.id, { onDelete: "cascade" }),
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

export const playthroughsRelations = relations(
	playthroughs,
	({ many, one }) => ({
		attempts: many(attemptRecords),
		completion: one(playthroughCompletions),
		moduleSelections: many(playthroughModuleSelections),
		scenarioSnapshots: many(scenarioSnapshots),
		user: one(users, {
			fields: [playthroughs.userId],
			references: [users.id],
		}),
		vod: one(vods, {
			fields: [playthroughs.vodId],
			references: [vods.id],
		}),
	}),
);

export const playthroughCompletionsRelations = relations(
	playthroughCompletions,
	({ one }) => ({
		playthrough: one(playthroughs, {
			fields: [playthroughCompletions.playthroughId],
			references: [playthroughs.id],
		}),
		user: one(users, {
			fields: [playthroughCompletions.userId],
			references: [users.id],
		}),
	}),
);

export const playthroughModuleSelectionsRelations = relations(
	playthroughModuleSelections,
	({ one }) => ({
		playthrough: one(playthroughs, {
			fields: [playthroughModuleSelections.playthroughId],
			references: [playthroughs.id],
		}),
	}),
);

export const scenarioSnapshotsRelations = relations(
	scenarioSnapshots,
	({ many, one }) => ({
		attempts: many(attemptRecords),
		playthrough: one(playthroughs, {
			fields: [scenarioSnapshots.playthroughId],
			references: [playthroughs.id],
		}),
	}),
);

export const attemptRecordsRelations = relations(attemptRecords, ({ one }) => ({
	playthrough: one(playthroughs, {
		fields: [attemptRecords.playthroughId],
		references: [playthroughs.id],
	}),
	scenario: one(scenarios, {
		fields: [attemptRecords.scenarioId],
		references: [scenarios.id],
	}),
	user: one(users, {
		fields: [attemptRecords.userId],
		references: [users.id],
	}),
}));
