import { count, desc, eq } from "drizzle-orm";
import { createAuditEntry } from "../audit/repository";
import { type DbContext, getDb } from "../client/client";
import { type DbResult, dbFailure, dbSuccess } from "../common/result";
import { type UserRole, users } from "./schema";
import { updateUserRoleInputSchema } from "./validation";

export interface GetUsersOptions {
	role?: UserRole;
	search?: string;
}

export type UserItem = typeof users.$inferSelect;

export async function getUserCount(
	context?: DbContext,
): Promise<DbResult<number>> {
	try {
		const db = await getDb(context);
		const [{ value }] = await db.select({ value: count() }).from(users);
		return dbSuccess(value);
	} catch (error) {
		return dbFailure(
			error instanceof Error ? error.message : "Failed to retrieve user count",
		);
	}
}

export async function getUserById(
	id: string,
	context?: DbContext,
): Promise<DbResult<UserItem | null>> {
	try {
		const db = await getDb(context);
		const user = await db.query.users.findFirst({
			where: (table, { eq }) => eq(table.id, id),
		});
		return dbSuccess(user ?? null);
	} catch (error) {
		return dbFailure(
			error instanceof Error ? error.message : "Failed to retrieve user by ID",
		);
	}
}

export async function getUsers(
	options: GetUsersOptions = {},
	context?: DbContext,
): Promise<DbResult<UserItem[]>> {
	try {
		const db = await getDb(context);
		const { role, search } = options;

		const userList = await db.query.users.findMany({
			orderBy: [desc(users.createdAt)],
			where: (table, { and, eq, like, or }) => {
				const conditions = [];
				if (search) {
					const query = `%${search.toLowerCase()}%`;
					conditions.push(
						or(like(table.name, query), like(table.email, query)),
					);
				}
				if (role) {
					conditions.push(eq(table.role, role));
				}
				return conditions.length > 0 ? and(...conditions) : undefined;
			},
		});

		return dbSuccess(userList);
	} catch (error) {
		return dbFailure(
			error instanceof Error ? error.message : "Failed to retrieve users",
		);
	}
}

export interface UpdateUserRoleParams {
	actorUserId: string;
	newRole: UserRole;
	targetUserId: string;
}

export async function updateUserRole(
	params: UpdateUserRoleParams,
	context?: DbContext,
): Promise<DbResult<UserItem>> {
	const parsed = updateUserRoleInputSchema.safeParse(params);
	if (!parsed.success) {
		return dbFailure(
			parsed.error.issues[0]?.message ?? "Invalid role update input",
		);
	}

	const { actorUserId, newRole, targetUserId } = parsed.data;

	if (actorUserId === targetUserId && newRole !== "ADMIN") {
		return dbFailure("Cannot demote your own account");
	}

	const targetUserResult = await getUserById(targetUserId, context);
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

	try {
		const db = await getDb(context);

		if (targetUser.role === "ADMIN" && newRole !== "ADMIN") {
			const [{ value: adminCount }] = await db
				.select({ value: count() })
				.from(users)
				.where(eq(users.role, "ADMIN"));

			if (adminCount <= 1) {
				return dbFailure("Cannot demote the last remaining administrator");
			}
		}

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

		await createAuditEntry(
			{
				action: "USER_ROLE_UPDATED",
				actorUserId,
				entityId: targetUserId,
				entityType: "USER",
				metadata: {
					newRole,
					previousRole: targetUser.role,
				},
			},
			context,
		);

		return dbSuccess(updatedUser);
	} catch (error) {
		return dbFailure(
			error instanceof Error ? error.message : "Failed to update user role",
		);
	}
}
