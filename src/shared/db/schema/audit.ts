/**
 * Defines the immutable audit log table and relation schemas for tracking administrative
 * mutations and system-wide state changes across domain entities.
 *
 * Implements the audit persistence schema for ADR-0010. Configures the `audit_entry` SQLite
 * table using Drizzle ORM, with UUID identifiers, timestamped action logs, composite indexes on
 * actor and entity references, polymorphic JSON metadata storage, and relations to the `users` table.
 */

import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { JsonValue } from "../core/types";
import { users } from "./auth";

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
