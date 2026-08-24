import { relations } from "drizzle-orm";
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

export const usersRelations = relations(users, ({ many }) => ({
	accounts: many(accounts),
	sessions: many(sessions),
}));
