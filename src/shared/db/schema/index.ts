import { relations } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
	| JsonPrimitive
	| { [key: string]: JsonValue }
	| JsonValue[];

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
	name: text("name").notNull(),
	updatedAt: integer("updatedAt", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});

export const usersRelations = relations(users, ({ many }) => ({
	accounts: many(accounts),
	attempts: many(attemptRecords),
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

export const vods = sqliteTable("vod", {
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
});

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

export const scenarios = sqliteTable("scenario", {
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
});

export const scenariosRelations = relations(scenarios, ({ many, one }) => ({
	attempts: many(attemptRecords),
	vod: one(vods, {
		fields: [scenarios.vodId],
		references: [vods.id],
	}),
}));

export const attemptRecords = sqliteTable("attempt_record", {
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
	responseTimeMs: integer("response_time_ms").notNull(),
	scenarioId: text("scenario_id")
		.notNull()
		.references(() => scenarios.id, { onDelete: "cascade" }),
	selectedOptionId: text("selected_option_id"),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
});

export const attemptRecordsRelations = relations(attemptRecords, ({ one }) => ({
	scenario: one(scenarios, {
		fields: [attemptRecords.scenarioId],
		references: [scenarios.id],
	}),
	user: one(users, {
		fields: [attemptRecords.userId],
		references: [users.id],
	}),
}));
