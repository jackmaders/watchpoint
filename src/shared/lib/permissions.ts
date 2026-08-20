import type { DbContext } from "../db/client/client";
import type { UserRole } from "../db/schema";
import { getCurrentUser } from "./auth";

export const PERMISSIONS = {
	ADMIN_ACCESS: "admin:access",
	AUDIT_VIEW: "audit:view",
	CATALOG_MANAGE: "catalog:manage",
	CATALOG_PUBLISH: "catalog:publish",
	USERS_MANAGE_ROLES: "users:manage-roles",
	USERS_VIEW: "users:view",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
	ADMIN: [
		PERMISSIONS.ADMIN_ACCESS,
		PERMISSIONS.USERS_MANAGE_ROLES,
		PERMISSIONS.USERS_VIEW,
		PERMISSIONS.AUDIT_VIEW,
		PERMISSIONS.CATALOG_MANAGE,
		PERMISSIONS.CATALOG_PUBLISH,
	],
	PLAYER: [],
};

export function hasPermission(
	role: UserRole | string | undefined | null,
	permission: Permission,
): boolean {
	if (!role || !(role in ROLE_PERMISSIONS)) {
		return false;
	}
	const rolePermissions = ROLE_PERMISSIONS[role as UserRole];
	return rolePermissions.includes(permission);
}

export function getUserPermissions(
	role: UserRole | string | undefined | null,
): Permission[] {
	if (!role || !(role in ROLE_PERMISSIONS)) {
		return [];
	}
	return [...ROLE_PERMISSIONS[role as UserRole]];
}

export interface AuthenticatedUser {
	email?: string;
	id: string;
	name?: string;
	role: UserRole;
}

export async function requirePermission(
	permission: Permission,
	reqHeaders?: Headers | Record<string, string> | null,
	context?: DbContext,
): Promise<AuthenticatedUser> {
	const user = await getCurrentUser(reqHeaders, context);

	if (!user) {
		throw new Response(
			JSON.stringify({
				error: "Unauthorized",
				message: "Authentication required",
			}),
			{
				headers: { "Content-Type": "application/json" },
				status: 401,
			},
		);
	}

	if (!hasPermission(user.role, permission)) {
		throw new Response(
			JSON.stringify({
				error: "Forbidden",
				message: `Missing required capability: ${permission}`,
			}),
			{
				headers: { "Content-Type": "application/json" },
				status: 403,
			},
		);
	}

	return {
		email: user.email,
		id: user.id,
		name: user.name,
		role: user.role as UserRole,
	};
}
