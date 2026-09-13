/**
 * Defines the OAuth and credential account database schema and foreign key relations.
 *
 * Implements Better Auth compatible account storage for ADR-0010. Configures Drizzle ORM
 * schema for `accounts` with cascade deletion linked to the `users` table.
 */

import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "./user";

export const accounts = sqliteTable("account", {
	accessToken: text("accessToken"),
	accessTokenExpiresAt: integer("accessTokenExpiresAt", {
		mode: "timestamp",
	}),
	accountId: text("accountId").notNull(),
	createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
	id: text("id").primaryKey(),
	idToken: text("idToken"),
	issuer: text("issuer"),
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
