import { desc } from "drizzle-orm";
import { type DbContext, getDb } from "../client/client";
import { auditEntries, type JsonValue } from "../schema";

export interface CreateAuditEntryInput {
	action: string;
	actorUserId?: string | null;
	entityId: string;
	entityType: string;
	metadata?: Record<string, JsonValue>;
}

export async function createAuditEntry(
	input: CreateAuditEntryInput,
	context?: DbContext,
) {
	const db = await getDb(context);
	const [entry] = await db
		.insert(auditEntries)
		.values({
			action: input.action,
			actorUserId: input.actorUserId ?? null,
			entityId: input.entityId,
			entityType: input.entityType,
			metadata: input.metadata ?? {},
		})
		.returning();

	return entry ?? null;
}

export async function getAuditEntries(
	entityType: string,
	entityId: string,
	context?: DbContext,
) {
	const db = await getDb(context);

	return db.query.auditEntries.findMany({
		orderBy: [desc(auditEntries.createdAt)],
		where: (entry, { and, eq }) =>
			and(eq(entry.entityType, entityType), eq(entry.entityId, entityId)),
	});
}

export interface GetAuditLogsOptions {
	actorUserId?: string;
	entityId?: string;
	entityType?: string;
	limit?: number;
	offset?: number;
}

export async function getAuditLogs(
	options: GetAuditLogsOptions = {},
	context?: DbContext,
) {
	const db = await getDb(context);
	const { actorUserId, entityId, entityType, limit, offset } = options;

	return db.query.auditEntries.findMany({
		limit,
		offset,
		orderBy: [desc(auditEntries.createdAt)],
		where: (entry, { and, eq }) => {
			const conditions = [];
			if (entityType) {
				conditions.push(eq(entry.entityType, entityType));
			}
			if (entityId) {
				conditions.push(eq(entry.entityId, entityId));
			}
			if (actorUserId) {
				conditions.push(eq(entry.actorUserId, actorUserId));
			}
			return conditions.length > 0 ? and(...conditions) : undefined;
		},
		with: {
			actor: true,
		},
	});
}
