/**
 * Defines the user account database schema, user role enumerations, and type definitions.
 *
 * Implements Better Auth compatible user table and Watchpoint role assignments for ADR-0010.
 * Configures Drizzle ORM schema for `users`, exporting the `userRoleEnum` ("PLAYER" | "ADMIN").
 */

import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
