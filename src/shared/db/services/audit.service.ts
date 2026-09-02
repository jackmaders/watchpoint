/**
 * Coordinates immutable audit logging and historical inspection queries for administrative
 * actions and domain state transitions across all entities.
 *
 * Implements the ADR-0010 domain service contract via `auditService`. Encapsulates Drizzle ORM
 * operations against Cloudflare D1, providing pagination-clamped query methods (`list`, `getById`, `count`)
 * with deterministic primary-key sort tiebreakers, dynamic column filters via `buildWhereConditions`,
 * and Zod-validated `create` log insertion wrapped in `executeQuery`.
 */

import { count, desc, eq } from "drizzle-orm";
import {
	buildPaginatedResult,
	buildWhereConditions,
	clampPagination,
	type DbContext,
	dbFailure,
	dbSuccess,
	executeQuery,
	getDb,
	type TableFilterOptions,
} from "../core";
import { auditEntries } from "../schema/audit";
import type { users } from "../schema/auth";
import {
	type CreateAuditEntryInput,
	insertAuditEntrySchema,
} from "../validation/audit";

export type AuditEntryItem = typeof auditEntries.$inferSelect;

export type AuditEntryWithActor = AuditEntryItem & {
	actor: typeof users.$inferSelect | null;
};

export type { CreateAuditEntryInput };

export type GetAuditLogsOptions = TableFilterOptions<
	typeof auditEntries,
	"actorUserId" | "entityId" | "entityType"
>;

export const auditService = {
	async count(options?: GetAuditLogsOptions, context?: DbContext) {
		const db = await getDb(context);
		const where = buildWhereConditions(auditEntries, options);
		const result = await executeQuery(
			db.select({ value: count() }).from(auditEntries).where(where),
			"Failed to retrieve audit log count",
		);

		if (!result.success) {
			return result;
		}

		return dbSuccess(result.data[0]?.value ?? 0);
	},

	async create(input: CreateAuditEntryInput, context?: DbContext) {
		const parsed = insertAuditEntrySchema.safeParse(input);
		if (!parsed.success) {
			return dbFailure(parsed.error.issues[0].message);
		}

		const db = await getDb(context);
		const result = await executeQuery(
			db.insert(auditEntries).values(parsed.data).returning(),
			"Failed to create audit entry",
		);

		if (!result.success) {
			return result;
		}

		const [entry] = result.data;
		if (!entry) {
			return dbFailure("Failed to create audit entry");
		}

		return dbSuccess(entry);
	},

	async getById(input: { id: string }, context?: DbContext) {
		const db = await getDb(context);
		return executeQuery(
			db.query.auditEntries.findFirst({
				where: eq(auditEntries.id, input.id),
				with: {
					actor: true,
				},
			}),
			"Failed to retrieve audit entry by ID",
		);
	},

	async list(options: GetAuditLogsOptions = {}, context?: DbContext) {
		const countResult = await auditService.count(options, context);
		if (!countResult.success) {
			return countResult;
		}

		const db = await getDb(context);
		const pagination = clampPagination(options);
		const where = buildWhereConditions(auditEntries, options);

		const logsResult = await executeQuery(
			db.query.auditEntries.findMany({
				limit: pagination.pageSize,
				offset: pagination.offset,
				orderBy: [desc(auditEntries.createdAt), desc(auditEntries.id)],
				where,
				with: {
					actor: true,
				},
			}),
			"Failed to retrieve audit logs",
		);
		if (!logsResult.success) {
			return logsResult;
		}

		return dbSuccess(
			buildPaginatedResult(logsResult.data, countResult.data, pagination),
		);
	},
};
