import { desc } from "drizzle-orm";
import { type DbContext, getDb } from "../client/client";
import { type DbResult, dbFailure, dbSuccess } from "../common/result";
import type { JsonValue } from "../common/types";
import { auditEntries } from "./schema";

export interface CreateAuditEntryInput {
	action: string;
	actorUserId?: string | null;
	entityId: string;
	entityType: string;
	metadata?: Record<string, JsonValue>;
}

export type AuditEntryItem = typeof auditEntries.$inferSelect;

export async function createAuditEntry(
	input: CreateAuditEntryInput,
	context?: DbContext,
): Promise<DbResult<AuditEntryItem | null>> {
	try {
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

		return dbSuccess(entry ?? null);
	} catch (error) {
		return dbFailure(
			error instanceof Error ? error.message : "Failed to create audit entry",
		);
	}
}

export async function getAuditEntries(
	entityType: string,
	entityId: string,
	context?: DbContext,
): Promise<DbResult<AuditEntryItem[]>> {
	try {
		const db = await getDb(context);
		const entries = await db.query.auditEntries.findMany({
			orderBy: [desc(auditEntries.createdAt)],
			where: (entry, { and, eq }) =>
				and(eq(entry.entityType, entityType), eq(entry.entityId, entityId)),
		});
		return dbSuccess(entries);
	} catch (error) {
		return dbFailure(
			error instanceof Error
				? error.message
				: "Failed to retrieve audit entries",
		);
	}
}

export interface GetAuditLogsOptions {
	actorUserId?: string;
	entityId?: string;
	entityType?: string;
	limit?: number;
	offset?: number;
}

export type AuditEntryWithActor =
	Awaited<ReturnType<typeof getAuditLogs>> extends DbResult<infer T>
		? T[number]
		: never;

export async function getAuditLogs(
	options: GetAuditLogsOptions = {},
	context?: DbContext,
) {
	try {
		const db = await getDb(context);
		const { actorUserId, entityId, entityType, limit, offset } = options;

		const logs = await db.query.auditEntries.findMany({
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

		return dbSuccess(logs);
	} catch (error) {
		return dbFailure(
			error instanceof Error ? error.message : "Failed to retrieve audit logs",
		);
	}
}
