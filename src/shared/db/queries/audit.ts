/**
 * Data access queries and operations for the audit entries table.
 *
 * Provides queryAuditEntries, createAuditEntry, getAuditEntryById, and deleteAuditEntry
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
import { auditEntries } from "../schema/audit";

type AuditEntry = InferSelectModel<typeof auditEntries>;
type AuditEntryValues = InferInsertModel<typeof auditEntries>;

export function queryAuditEntries(
	options: QueryOptions<typeof auditEntries> = {},
	db = createDbClient(),
) {
	const { filter, order, limit = DEFAULT_LIMIT } = options;

	return db
		.select()
		.from(auditEntries)
		.where(filterToSQL(auditEntries, filter))
		.orderBy(orderToSQL(auditEntries, order))
		.limit(limit)
		.all();
}

export function createAuditEntry(
	values: AuditEntryValues,
	db = createDbClient(),
) {
	return db.insert(auditEntries).values(values).returning().get();
}

export function getAuditEntryById(id: AuditEntry["id"], db = createDbClient()) {
	return db.select().from(auditEntries).where(eq(auditEntries.id, id)).get();
}

export function deleteAuditEntry(id: AuditEntry["id"], db = createDbClient()) {
	return db
		.delete(auditEntries)
		.where(eq(auditEntries.id, id))
		.returning()
		.get();
}
