/**
 * Business rules and validation schemas for updating user roles and privilege escalation/demotion.
 *
 * Enforces self-demotion guards, entity verification, and last-administrator protection rules
 * without throwing errors, returning discriminated union results.
 */

import { z } from "zod";
import {
	createAuditEntry,
	getUserById,
	queryUsers,
	updateUser,
	userRoleEnum,
} from "@/shared/db";
import type { UserItem } from "./types";

export const updateUserRoleSchema = z.object({
	actorUserId: z.string().min(1),
	newRole: z.enum(userRoleEnum),
	targetUserId: z.string().min(1),
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

export type UpdateUserRoleResult =
	| { status: "success"; user: UserItem }
	| { status: "rejected"; reason: string };

/**
 * Validates and executes a user role mutation rule against database queries.
 *
 * Concurrency note: Multiple concurrent demotion requests could race between the administrator
 * count query and role update; an interactive transaction or serializable lock on SQLite/D1 would close this race.
 */
export async function updateUserRoleRule(
	input: UpdateUserRoleInput,
	db?: Parameters<typeof updateUser>[2],
): Promise<UpdateUserRoleResult> {
	if (input.actorUserId === input.targetUserId && input.newRole !== "ADMIN") {
		return { reason: "Cannot demote your own account", status: "rejected" };
	}

	const targetUser = await getUserById(input.targetUserId, db);
	if (!targetUser) {
		return { reason: "User not found", status: "rejected" };
	}

	if (targetUser.role === input.newRole) {
		return { status: "success", user: targetUser };
	}

	if (targetUser.role === "ADMIN" && input.newRole !== "ADMIN") {
		const adminUsers = await queryUsers({ filter: { role: "ADMIN" } }, db);
		if (adminUsers.length <= 1) {
			return {
				reason: "Cannot demote the last remaining administrator",
				status: "rejected",
			};
		}
	}

	const updated = await updateUser(
		input.targetUserId,
		{ role: input.newRole, updatedAt: new Date() },
		db,
	);

	if (!updated) {
		return { reason: "Failed to update user role", status: "rejected" };
	}

	await createAuditEntry(
		{
			action: "USER_ROLE_UPDATED",
			actorUserId: input.actorUserId,
			entityId: input.targetUserId,
			entityType: "USER",
			metadata: {
				newRole: input.newRole,
				previousRole: targetUser.role,
			},
		},
		db,
	);

	return { status: "success", user: updated };
}
