/**
 * Server functions for administrative user account management and role changes.
 *
 * Implements `getAdminUsers` and `updateUserRole` server functions using TanStack Start `createServerFn`,
 * checking permission guards (`users:view`, `users:manage-roles`) and delegating mutations to model rules.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requirePermission } from "@/shared/lib/permissions";
import { getAdminUsersRule } from "../model/get-admin-users";
import type { UserItem } from "../model/types";
import {
	type UpdateUserRoleResult,
	updateUserRoleRule,
} from "../model/update-user-role";

export const GetAdminUsersSchema = z.object({
	role: z.enum(["PLAYER", "ADMIN"]).optional(),
	search: z.string().optional(),
});

export type GetAdminUsersPayload = z.infer<typeof GetAdminUsersSchema>;

export const UpdateUserRoleSchema = z.object({
	newRole: z.enum(["PLAYER", "ADMIN"]),
	targetUserId: z.string().min(1),
});

export type UpdateUserRolePayload = z.infer<typeof UpdateUserRoleSchema>;

export const getAdminUsers = createServerFn({ method: "GET" })
	.validator((data: unknown) => {
		const parsed = GetAdminUsersSchema.safeParse(data ?? {});
		if (!parsed.success) {
			throw new Error("Invalid users query payload");
		}
		return parsed.data;
	})
	.handler(async ({ data }): Promise<UserItem[]> => {
		await requirePermission("users:view");
		return getAdminUsersRule(data);
	});

export const updateUserRole = createServerFn({ method: "POST" })
	.validator((data: unknown) => {
		const parsed = UpdateUserRoleSchema.safeParse(data);
		if (!parsed.success) {
			throw new Error("Invalid role update payload");
		}
		return parsed.data;
	})
	.handler(async ({ data }): Promise<UpdateUserRoleResult> => {
		const actor = await requirePermission("users:manage-roles");
		return updateUserRoleRule({
			actorUserId: actor.id,
			newRole: data.newRole,
			targetUserId: data.targetUserId,
		});
	});
