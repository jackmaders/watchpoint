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

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
	| JsonPrimitive
	| { [key: string]: JsonValue }
	| JsonValue[];

export const userRoleEnum = ["PLAYER", "ADMIN"] as const;
export type UserRole = (typeof userRoleEnum)[number];

export const users = sqliteTable("user", {
	createdAt: integer("createdAt", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
	email: text("email").notNull().unique(),
	emailVerified: integer("emailVerified", { mode: "boolean" })
		.notNull()
		.default(false),
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	image: text("image"),
	isTestAccount: integer("is_test_account", { mode: "boolean" })
		.notNull()
		.default(false),
	name: text("name").notNull(),
	role: text("role", { enum: userRoleEnum }).notNull().default("PLAYER"),
	updatedAt: integer("updatedAt", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});

export const usersRelations = relations(users, ({ many }) => ({
	accounts: many(accounts),
	attempts: many(attemptRecords),
	auditEntries: many(auditEntries),
	playthroughCompletions: many(playthroughCompletions),
	playthroughs: many(playthroughs),
	sessions: many(sessions),
}));

export const sessions = sqliteTable("session", {
	createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
	expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
	id: text("id").primaryKey(),
	ipAddress: text("ipAddress"),
	token: text("token").notNull().unique(),
	updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
	userAgent: text("userAgent"),
	userId: text("userId")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
});

export const sessionsRelations = relations(sessions, ({ one }) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id],
	}),
}));

export const accounts = sqliteTable("account", {
	accessToken: text("accessToken"),
	accessTokenExpiresAt: integer("accessTokenExpiresAt", {
		mode: "timestamp",
	}),
	accountId: text("accountId").notNull(),
	createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
	id: text("id").primaryKey(),
	idToken: text("idToken"),
	password: text("password"),
	providerId: text("providerId").notNull(),
	refreshToken: text("refreshToken"),
	refreshTokenExpiresAt: integer("refreshTokenExpiresAt", {
		mode: "timestamp",
	}),
	scope: text("scope"),
	updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
	userId: text("userId")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
});

export const accountsRelations = relations(accounts, ({ one }) => ({
	user: one(users, {
		fields: [accounts.userId],
		references: [users.id],
	}),
}));

export const verifications = sqliteTable("verification", {
	createdAt: integer("createdAt", { mode: "timestamp" }),
	expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	updatedAt: integer("updatedAt", { mode: "timestamp" }),
	value: text("value").notNull(),
});

export const vods = sqliteTable(
	"vod",
	{
		createdAt: integer("created_at", { mode: "timestamp" })
			.notNull()
			.$defaultFn(() => new Date()),
		durationSeconds: integer("duration_seconds").notNull(),
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		isPublished: integer("is_published", { mode: "boolean" })
			.notNull()
			.default(false),
		mapName: text("map_name").notNull(),
		rankTier: text("rank_tier").notNull(),
		title: text("title").notNull(),
		youtubeVideoId: text("youtube_video_id").notNull(),
	},
	(table) => ({
		publishedCreatedAtIdx: index("vod_published_created_at_idx").on(
			table.isPublished,
			table.createdAt,
		),
	}),
);

export const vodsRelations = relations(vods, ({ many }) => ({
	scenarios: many(scenarios),
}));

export const moduleTypeEnum = [
	"STRATEGY",
	"TACTICS",
	"ULTIMATE",
	"COOLDOWN",
	"SPATIAL",
] as const;

export type ModuleType = (typeof moduleTypeEnum)[number];

export const inputTypeEnum = [
	"MULTIPLE_CHOICE",
	"PERCENT_SLIDER",
	"TIME_SLIDER",
	"MAP_PIN_2D",
] as const;

export type InputType = (typeof inputTypeEnum)[number];

export const scenarios = sqliteTable(
	"scenario",
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
		promptText: text("prompt_text").notNull(),
		timeLimitSeconds: integer("time_limit_seconds"),
		timestampSeconds: real("timestamp_seconds").notNull(),
		vodId: text("vod_id")
			.notNull()
			.references(() => vods.id, { onDelete: "cascade" }),
	},
	(table) => ({
		moduleTypeIdx: index("scenario_module_type_idx").on(table.moduleType),
		vodTimestampIdx: index("scenario_vod_timestamp_idx").on(
			table.vodId,
			table.timestampSeconds,
		),
	}),
);

export const scenariosRelations = relations(scenarios, ({ many, one }) => ({
	attempts: many(attemptRecords),
	vod: one(vods, {
		fields: [scenarios.vodId],
		references: [vods.id],
	}),
}));

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

export const playthroughModuleSelectionsRelations = relations(
	playthroughModuleSelections,
	({ one }) => ({
		playthrough: one(playthroughs, {
			fields: [playthroughModuleSelections.playthroughId],
			references: [playthroughs.id],
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

export const auditEntries = sqliteTable(
	"audit_entry",
	{
		action: text("action").notNull(),
		actorUserId: text("actor_user_id").references(() => users.id, {
			onDelete: "set null",
		}),
		createdAt: integer("created_at", { mode: "timestamp" })
			.notNull()
			.$defaultFn(() => new Date()),
		entityId: text("entity_id").notNull(),
		entityType: text("entity_type").notNull(),
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		metadata: text("metadata", { mode: "json" })
			.$type<Record<string, JsonValue>>()
			.notNull(),
	},
	(table) => ({
		actorCreatedAtIdx: index("audit_entry_actor_created_at_idx").on(
			table.actorUserId,
			table.createdAt,
		),
		entityCreatedAtIdx: index("audit_entry_entity_created_at_idx").on(
			table.entityType,
			table.entityId,
			table.createdAt,
		),
	}),
);

export const auditEntriesRelations = relations(auditEntries, ({ one }) => ({
	actor: one(users, {
		fields: [auditEntries.actorUserId],
		references: [users.id],
	}),
}));
