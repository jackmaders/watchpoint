/**
 * Coordinates user identity management, role administration, and administrative demotion
 * guardrails across the platform.
 *
 * Implements the ADR-0010 domain service contract via `authService`. Encapsulates Drizzle ORM
 * queries on Cloudflare D1, providing sanitized paginated user searches via `escapeLike` and
 * `buildWhereConditions`, single-user lookups, and role updates with mandatory last-admin demotion
 * protection and automated audit logging, returning non-throwing `DbResult<T>` responses via `executeQuery`.
 */

import { and, count, desc, eq, like, or } from "drizzle-orm";
import {
	buildPaginatedResult,
	buildWhereConditions,
	clampPagination,
	dbFailure,
	dbSuccess,
	escapeLike,
	executeQuery,
	getDb,
	type TableFilterOptions,
} from "../core";
import { type UserRole, users } from "../schema/auth";
import { updateUserRoleInputSchema } from "../validation/auth";
import { auditService } from "./audit.service";

export type GetUsersOptions = TableFilterOptions<typeof users, "role"> & {
	search?: string;
};

export type UserItem = typeof users.$inferSelect;

export interface UpdateUserRoleParams {
	actorUserId: string;
	newRole: UserRole;
	targetUserId: string;
}

async function validateDemotionPreconditions(
	targetUser: UserItem,
	newRole: UserRole,
): Promise<string | null> {
	if (targetUser.role !== "ADMIN" || newRole === "ADMIN") {
		return null;
	}

	const db = await getDb();
	const [{ value: adminCount = 0 } = {}] = await db
		.select({ value: count() })
		.from(users)
		.where(eq(users.role, "ADMIN"));

	if (adminCount <= 1) {
		return "Cannot demote the last remaining administrator";
	}

	return null;
}

export const authService = {
	async count() {
		const db = await getDb();
		const query = db
			.select({ value: count() })
			.from(users)
			.then(([row]) => row?.value ?? 0);

		return executeQuery(query, "Failed to retrieve user count");
	},

	async getById(input: { id: string }) {
		const db = await getDb();
		const query = db.query.users.findFirst({
			where: eq(users.id, input.id),
		});

		return executeQuery(query, "Failed to retrieve user by ID");
	},

	async list(options: GetUsersOptions = {}) {
		const db = await getDb();
		const pagination = clampPagination(options);
		const tableFilter = buildWhereConditions(users, options);
		const search = options.search?.trim();
		const queryPattern = search
			? `%${escapeLike(search.toLowerCase())}%`
			: undefined;
		const searchFilter = queryPattern
			? or(like(users.name, queryPattern), like(users.email, queryPattern))
			: undefined;

		const where =
			tableFilter && searchFilter
				? and(tableFilter, searchFilter)
				: (tableFilter ?? searchFilter);

		const query = Promise.all([
			db.select({ value: count() }).from(users).where(where),
			db.query.users.findMany({
				limit: pagination.pageSize,
				offset: pagination.offset,
				orderBy: [desc(users.createdAt), desc(users.id)],
				where,
			}),
		]).then(([countRows, items]) => {
			const total = countRows[0]?.value ?? 0;
			return buildPaginatedResult(items, total, pagination);
		});

		return executeQuery(query, "Failed to retrieve users");
	},

	async updateUserRole(params: UpdateUserRoleParams) {
		const parsed = updateUserRoleInputSchema.safeParse(params);
		if (!parsed.success) {
			return dbFailure(parsed.error.issues[0].message);
		}

		const { actorUserId, newRole, targetUserId } = parsed.data;

		if (actorUserId === targetUserId && newRole !== "ADMIN") {
			return dbFailure("Cannot demote your own account");
		}

		const targetUserResult = await authService.getById({ id: targetUserId });
		if (!targetUserResult.success) {
			return dbFailure(targetUserResult.error);
		}
		const targetUser = targetUserResult.data;
		if (!targetUser) {
			return dbFailure("User not found");
		}

		if (targetUser.role === newRole) {
			return dbSuccess(targetUser);
		}

		const demotionError = await validateDemotionPreconditions(
			targetUser,
			newRole,
		);
		if (demotionError) {
			return dbFailure(demotionError);
		}

		const db = await getDb();
		const query = db
			.update(users)
			.set({
				role: newRole,
				updatedAt: new Date(),
			})
			.where(eq(users.id, targetUserId))
			.returning()
			.then(async ([updatedUser]) => {
				if (!updatedUser) {
					throw new Error("Failed to update user role");
				}

				await auditService.create({
					action: "USER_ROLE_UPDATED",
					actorUserId,
					entityId: targetUserId,
					entityType: "USER",
					metadata: {
						newRole,
						previousRole: targetUser.role,
					},
				});

				return updatedUser;
			});

		return executeQuery(query, "Failed to update user role");
	},
};
