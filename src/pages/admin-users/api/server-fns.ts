import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	authService,
	type DbResult,
	type UserItem,
	userRoleEnum,
} from "@/shared/db";
import { requirePermission } from "@/shared/lib/permissions";

export const GetAdminUsersSchema = z.object({
	role: z.enum(userRoleEnum).optional(),
	search: z.string().optional(),
});

export type GetAdminUsersPayload = z.infer<typeof GetAdminUsersSchema>;

export const UpdateUserRoleSchema = z.object({
	newRole: z.enum(userRoleEnum),
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
		const result = await authService.list(data);
		if (!result.success) {
			throw new Error(result.error);
		}
		return result.data.items;
	});

export const updateUserRole = createServerFn({ method: "POST" })
	.validator((data: unknown) => {
		const parsed = UpdateUserRoleSchema.safeParse(data);
		if (!parsed.success) {
			throw new Error("Invalid role update payload");
		}
		return parsed.data;
	})
	.handler(async ({ data }): Promise<DbResult<UserItem>> => {
		const actor = await requirePermission("users:manage-roles");
		return authService.updateUserRole({
			actorUserId: actor.id,
			newRole: data.newRole,
			targetUserId: data.targetUserId,
		});
	});
