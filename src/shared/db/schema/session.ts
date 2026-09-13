/**
 * Defines the user authentication session database schema and foreign key relations.
 *
 * Implements Better Auth compatible session management for ADR-0010. Configures Drizzle ORM
 * schema for `sessions` with cascade deletion linked to the `users` table.
 */

import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "./user";

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
