export const USER_ROLES = ["user", "admin"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export function isAdmin(user: { role?: string | null }): boolean {
	return user.role === "admin";
}
