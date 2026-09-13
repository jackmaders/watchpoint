/**
 * Data access queries and operations for the users table.
 *
 * Provides queryUsers, createUser, getUserById, getUserByEmail, updateUser, and deleteUser
 * adhering to per-request client passing and standard limit/returning conventions.
 */

import { eq, type InferInsertModel, type InferSelectModel } from "drizzle-orm";
import { createDbClient } from "../client";
import {
	DEFAULT_LIMIT,
	filterToSQL,
	orderToSQL,
	type QueryOptions,
} from "../query";
import { users } from "../schema/user";

type User = InferSelectModel<typeof users>;
type UserValues = InferInsertModel<typeof users>;

export function queryUsers(
	options: QueryOptions<typeof users> = {},
	db = createDbClient(),
) {
	const { filter, order, limit = DEFAULT_LIMIT } = options;

	return db
		.select()
		.from(users)
		.where(filterToSQL(users, filter))
		.orderBy(orderToSQL(users, order))
		.limit(limit)
		.all();
}

export function createUser(values: UserValues, db = createDbClient()) {
	return db.insert(users).values(values).returning().get();
}

export function getUserById(id: User["id"], db = createDbClient()) {
	return db.select().from(users).where(eq(users.id, id)).get();
}

export function getUserByEmail(email: User["email"], db = createDbClient()) {
	return db.select().from(users).where(eq(users.email, email)).get();
}

export function updateUser(
	id: User["id"],
	values: Partial<UserValues>,
	db = createDbClient(),
) {
	return db.update(users).set(values).where(eq(users.id, id)).returning().get();
}

export function deleteUser(id: User["id"], db = createDbClient()) {
	return db.delete(users).where(eq(users.id, id)).returning().get();
}
