/**
 * Defines the verification token database schema for authentication lifecycle operations.
 *
 * Implements Better Auth compatible token verification storage for ADR-0010. Configures Drizzle ORM
 * schema for `verifications`.
 */

import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const verifications = sqliteTable("verification", {
	createdAt: integer("createdAt", { mode: "timestamp" }),
	expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	updatedAt: integer("updatedAt", { mode: "timestamp" }),
	value: text("value").notNull(),
});
