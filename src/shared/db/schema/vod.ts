/**
 * Defines database schemas, enumerations, and type definitions for Overwatch 2 gameplay VODs.
 *
 * Implements the core content domain schema for ADR-0002, ADR-0003, and ADR-0010. Configures
 * Drizzle ORM table for `vods`, exporting `heroRoleEnum` alongside publication indexes.
 */

import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const heroRoleEnum = ["TANK", "DAMAGE", "SUPPORT"] as const;
export type HeroRole = (typeof heroRoleEnum)[number];

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
