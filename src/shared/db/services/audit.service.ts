import { and, count, desc, eq } from "drizzle-orm";
import {
	clampPagination,
	type DbContext,
	type DbResult,
	dbFailure,
	dbSuccess,
	getDb,
	type JsonValue,
	type PaginatedResult,
	type PaginationOptions,
	toErrorMessage,
} from "../core";
import { auditEntries } from "../schema/audit";
import type { users } from "../schema/auth";

export interface CreateAuditEntryInput {
	action: string;
	actorUserId?: string | null;
	entityId: string;
	entityType: string;
	metadata?: Record<string, JsonValue>;
}

export type AuditEntryItem = typeof auditEntries.$inferSelect;

export interface GetAuditLogsOptions extends PaginationOptions {
	actorUserId?: string;
	entityId?: string;
	entityType?: string;
	limit?: number;
	offset?: number;
}

export type AuditEntryWithActor = AuditEntryItem & {
	actor: typeof users.$inferSelect | null;
};

export const auditService = {
	async create(
		input: CreateAuditEntryInput,
		context?: DbContext,
	): Promise<DbResult<AuditEntryItem>> {
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

			if (!entry) {
				return dbFailure("Failed to create audit entry");
			}

			return dbSuccess(entry);
		} catch (error) {
			return dbFailure(toErrorMessage(error, "Failed to create audit entry"));
		}
	},
	list(
		options: GetAuditLogsOptions = {},
		context?: DbContext,
	): Promise<DbResult<PaginatedResult<AuditEntryWithActor>>> {
		return auditService.listLogs(options, context);
	},

	async listByEntity(
		entityType: string,
		entityId: string,
		context?: DbContext,
	): Promise<DbResult<AuditEntryItem[]>> {
		try {
			const db = await getDb(context);
			const entries = await db.query.auditEntries.findMany({
				orderBy: [desc(auditEntries.createdAt), desc(auditEntries.id)],
				where: (entry, { and, eq }) =>
					and(eq(entry.entityType, entityType), eq(entry.entityId, entityId)),
			});
			return dbSuccess(entries);
		} catch (error) {
			return dbFailure(
				toErrorMessage(error, "Failed to retrieve audit entries"),
			);
		}
	},

	async listLogs(
		options: GetAuditLogsOptions = {},
		context?: DbContext,
	): Promise<DbResult<PaginatedResult<AuditEntryWithActor>>> {
		try {
			const db = await getDb(context);
			const { actorUserId, entityId, entityType } = options;
			const { offset, page, pageSize } = clampPagination(options);

			const conditions = [];
			if (entityType) {
				conditions.push(eq(auditEntries.entityType, entityType));
			}
			if (entityId) {
				conditions.push(eq(auditEntries.entityId, entityId));
			}
			if (actorUserId) {
				conditions.push(eq(auditEntries.actorUserId, actorUserId));
			}
			const whereClause =
				conditions.length > 0 ? and(...conditions) : undefined;

			const [{ value: total = 0 } = {}] = await db
				.select({ value: count() })
				.from(auditEntries)
				.where(whereClause);

			const logs = await db.query.auditEntries.findMany({
				limit: pageSize,
				offset,
				orderBy: [desc(auditEntries.createdAt), desc(auditEntries.id)],
				where: (entry, { and, eq }) => {
					const conds = [];
					if (entityType) conds.push(eq(entry.entityType, entityType));
					if (entityId) conds.push(eq(entry.entityId, entityId));
					if (actorUserId) conds.push(eq(entry.actorUserId, actorUserId));
					return conds.length > 0 ? and(...conds) : undefined;
				},
				with: {
					actor: true,
				},
			});

			const totalPages = Math.max(1, Math.ceil(total / pageSize));

			return dbSuccess({
				items: logs,
				page,
				pageSize,
				total,
				totalPages,
			});
		} catch (error) {
			return dbFailure(toErrorMessage(error, "Failed to retrieve audit logs"));
		}
	},
};

export const createAuditEntry = auditService.create;
export const getAuditEntries = auditService.listByEntity;
export const getAuditLogs = auditService.listLogs;
