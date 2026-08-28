import { and, count, desc, eq, like, or } from "drizzle-orm";
import {
	buildPaginatedResult,
	clampPagination,
	type DbContext,
	type DbResult,
	dbFailure,
	dbSuccess,
	escapeLike,
	getDb,
	type PaginatedResult,
	type PaginationOptions,
	toErrorMessage,
} from "../core";
import { type UserRole, users } from "../schema/auth";
import { updateUserRoleInputSchema } from "../validation/auth";
import { auditService } from "./audit.service";

export interface GetUsersOptions extends PaginationOptions {
	role?: UserRole;
	search?: string;
}

export type UserItem = typeof users.$inferSelect;

export interface UpdateUserRoleParams {
	actorUserId: string;
	newRole: UserRole;
	targetUserId: string;
}

async function validateDemotionPreconditions(
	targetUser: UserItem,
	newRole: UserRole,
	context?: DbContext,
): Promise<string | null> {
	if (targetUser.role !== "ADMIN" || newRole === "ADMIN") {
		return null;
	}

	const db = await getDb(context);
	const [{ value: adminCount }] = await db
		.select({ value: count() })
		.from(users)
		.where(eq(users.role, "ADMIN"));

	if (adminCount <= 1) {
		return "Cannot demote the last remaining administrator";
	}

	return null;
}

async function applyUserRoleUpdate(
	targetUserId: string,
	newRole: UserRole,
	previousRole: UserRole,
	actorUserId: string,
	context?: DbContext,
): Promise<DbResult<UserItem>> {
	try {
		const db = await getDb(context);
		const [updatedUser] = await db
			.update(users)
			.set({
				role: newRole,
				updatedAt: new Date(),
			})
			.where(eq(users.id, targetUserId))
			.returning();

		if (!updatedUser) {
			return dbFailure("Failed to update user role");
		}

		await auditService.create(
			{
				action: "USER_ROLE_UPDATED",
				actorUserId,
				entityId: targetUserId,
				entityType: "USER",
				metadata: {
					newRole,
					previousRole,
				},
			},
			context,
		);

		return dbSuccess(updatedUser);
	} catch (error) {
		return dbFailure(toErrorMessage(error, "Failed to update user role"));
	}
}

export const authService = {
	async count(
		_options?: Record<string, never>,
		context?: DbContext,
	): Promise<DbResult<number>> {
		try {
			const db = await getDb(context);
			const [row] = await db.select({ value: count() }).from(users);
			return dbSuccess(row?.value ?? 0);
		} catch (error) {
			return dbFailure(toErrorMessage(error, "Failed to retrieve user count"));
		}
	},

	async getById(
		input: { id: string },
		context?: DbContext,
	): Promise<DbResult<UserItem | null>> {
		try {
			const db = await getDb(context);
			const user = await db.query.users.findFirst({
				where: (table, { eq }) => eq(table.id, input.id),
			});
			return dbSuccess(user ?? null);
		} catch (error) {
			return dbFailure(toErrorMessage(error, "Failed to retrieve user by ID"));
		}
	},

	async list(
		options: GetUsersOptions = {},
		context?: DbContext,
	): Promise<DbResult<PaginatedResult<UserItem>>> {
		try {
			const db = await getDb(context);
			const { role, search } = options;
			const pagination = clampPagination(options);

			const conditions = [];
			if (search && search.trim().length > 0) {
				const query = `%${escapeLike(search.trim().toLowerCase())}%`;
				conditions.push(or(like(users.name, query), like(users.email, query)));
			}
			if (role) {
				conditions.push(eq(users.role, role));
			}
			const whereClause =
				conditions.length > 0 ? and(...conditions) : undefined;

			const [{ value: total = 0 } = {}] = await db
				.select({ value: count() })
				.from(users)
				.where(whereClause);

			const userList = await db.query.users.findMany({
				limit: pagination.pageSize,
				offset: pagination.offset,
				orderBy: [desc(users.createdAt), desc(users.id)],
				where: (table, { and, eq, like, or }) => {
					const conds = [];
					if (search && search.trim().length > 0) {
						const query = `%${escapeLike(search.trim().toLowerCase())}%`;
						conds.push(or(like(table.name, query), like(table.email, query)));
					}
					if (role) {
						conds.push(eq(table.role, role));
					}
					return conds.length > 0 ? and(...conds) : undefined;
				},
			});

			return dbSuccess(buildPaginatedResult(userList, total, pagination));
		} catch (error) {
			return dbFailure(toErrorMessage(error, "Failed to retrieve users"));
		}
	},

	async updateUserRole(
		params: UpdateUserRoleParams,
		context?: DbContext,
	): Promise<DbResult<UserItem>> {
		const parsed = updateUserRoleInputSchema.safeParse(params);
		if (!parsed.success) {
			return dbFailure(parsed.error.issues[0].message);
		}

		const { actorUserId, newRole, targetUserId } = parsed.data;

		if (actorUserId === targetUserId && newRole !== "ADMIN") {
			return dbFailure("Cannot demote your own account");
		}

		const targetUserResult = await authService.getById(
			{ id: targetUserId },
			context,
		);
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
			context,
		);
		if (demotionError) {
			return dbFailure(demotionError);
		}

		return applyUserRoleUpdate(
			targetUserId,
			newRole,
			targetUser.role,
			actorUserId,
			context,
		);
	},
};
