/**
 * Data access queries and operations for the attempt_record table.
 *
 * Provides standard list queries with pagination and filtering, inserts, updates, and deletions
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
import { attemptRecords } from "../schema/attempt-record";

type AttemptRecord = InferSelectModel<typeof attemptRecords>;
type AttemptRecordValues = InferInsertModel<typeof attemptRecords>;

export function queryAttemptRecords(
	options: QueryOptions<typeof attemptRecords> = {},
	db = createDbClient(),
) {
	const { filter, order, limit = DEFAULT_LIMIT } = options;

	return db
		.select()
		.from(attemptRecords)
		.where(filterToSQL(attemptRecords, filter))
		.orderBy(orderToSQL(attemptRecords, order))
		.limit(limit)
		.all();
}

export function getAttemptRecordById(
	id: AttemptRecord["id"],
	db = createDbClient(),
) {
	return db
		.select()
		.from(attemptRecords)
		.where(eq(attemptRecords.id, id))
		.get();
}

export function createAttemptRecord(
	values: AttemptRecordValues,
	db = createDbClient(),
) {
	return db.insert(attemptRecords).values(values).returning().get();
}

export function updateAttemptRecord(
	id: AttemptRecord["id"],
	values: Partial<AttemptRecordValues>,
	db = createDbClient(),
) {
	return db
		.update(attemptRecords)
		.set(values)
		.where(eq(attemptRecords.id, id))
		.returning()
		.get();
}

export function deleteAttemptRecord(
	id: AttemptRecord["id"],
	db = createDbClient(),
) {
	return db
		.delete(attemptRecords)
		.where(eq(attemptRecords.id, id))
		.returning()
		.get();
}
