import { relations } from "drizzle-orm";
import {
	index,
	integer,
	real,
	sqliteTable,
	text,
} from "drizzle-orm/sqlite-core";
import type { JsonValue } from "../common/types";

export const heroRoleEnum = ["TANK", "DAMAGE", "SUPPORT"] as const;
export type HeroRole = (typeof heroRoleEnum)[number];

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

export const vods = sqliteTable(
	"vod",
	{
		createdAt: integer("created_at", { mode: "timestamp" })
			.notNull()
			.$defaultFn(() => new Date()),
		durationSeconds: integer("duration_seconds").notNull(),
		heroName: text("hero_name").notNull(),
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		isPublished: integer("is_published", { mode: "boolean" })
			.notNull()
			.default(false),
		mapName: text("map_name").notNull(),
		rankTier: text("rank_tier").notNull(),
		role: text("role", { enum: heroRoleEnum }).notNull(),
		title: text("title").notNull(),
		youtubeVideoId: text("youtube_video_id").notNull(),
	},
	(table) => ({
		publishedCreatedAtIdx: index("vod_published_created_at_idx").on(
			table.isPublished,
			table.createdAt,
		),
		publishedRoleIdx: index("vod_published_role_idx").on(
			table.isPublished,
			table.role,
		),
	}),
);

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

export const vodsRelations = relations(vods, ({ many }) => ({
	scenarios: many(scenarios),
}));

export const scenariosRelations = relations(scenarios, ({ one }) => ({
	vod: one(vods, {
		fields: [scenarios.vodId],
		references: [vods.id],
	}),
}));
