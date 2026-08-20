import { count, desc, eq } from "drizzle-orm";
import { type DbContext, getDb } from "../client/client";
import { type UserRole, users } from "../schema";
import { createAuditEntry } from "./audit";

export interface GetUsersOptions {
	role?: UserRole;
	search?: string;
}

export type UserItem = typeof users.$inferSelect;

export async function getUserCount(context?: DbContext): Promise<number> {
	const db = await getDb(context);
	const [{ value }] = await db.select({ value: count() }).from(users);
	return value;
}

export async function getUserById(
	id: string,
	context?: DbContext,
): Promise<UserItem | null> {
	const db = await getDb(context);
	const user = await db.query.users.findFirst({
		where: (table, { eq }) => eq(table.id, id),
	});
	return user ?? null;
}

export async function getUsers(
	options: GetUsersOptions = {},
	context?: DbContext,
): Promise<UserItem[]> {
	const db = await getDb(context);
	const { role, search } = options;

	return db.query.users.findMany({
		orderBy: [desc(users.createdAt)],
		where: (table, { and, eq, like, or }) => {
			const conditions = [];
			if (search) {
				const query = `%${search.toLowerCase()}%`;
				conditions.push(or(like(table.name, query), like(table.email, query)));
			}
			if (role) {
				conditions.push(eq(table.role, role));
			}
			return conditions.length > 0 ? and(...conditions) : undefined;
		},
	});
}

export interface UpdateUserRoleParams {
	actorUserId: string;
	newRole: UserRole;
	targetUserId: string;
}

export interface UpdateUserRoleResult {
	error?: string;
	success: boolean;
	user?: UserItem;
}

export async function updateUserRole(
	params: UpdateUserRoleParams,
	context?: DbContext,
): Promise<UpdateUserRoleResult> {
	const { actorUserId, newRole, targetUserId } = params;

	if (actorUserId === targetUserId && newRole !== "ADMIN") {
		return {
			error: "Cannot demote your own account",
			success: false,
		};
	}

	const targetUser = await getUserById(targetUserId, context);
	if (!targetUser) {
		return {
			error: "User not found",
			success: false,
		};
	}

	if (targetUser.role === newRole) {
		return {
			success: true,
			user: targetUser,
		};
	}

	const db = await getDb(context);

	if (targetUser.role === "ADMIN" && newRole !== "ADMIN") {
		const [{ value: adminCount }] = await db
			.select({ value: count() })
			.from(users)
			.where(eq(users.role, "ADMIN"));

		if (adminCount <= 1) {
			return {
				error: "Cannot demote the last remaining administrator",
				success: false,
			};
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

	return {
		success: true,
		user: updatedUser,
	};
}
