import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "../auth/schema";
import type { JsonValue } from "../common/types";

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
