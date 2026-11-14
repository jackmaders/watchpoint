import type { UserRole } from "../db/schema";

type Permission = "vods:read";

const ROLE_PERMISSIONS = new Map<UserRole, readonly Permission[]>([
  ["admin", ["vods:read"]],
  ["user", ["vods:read"]],
]);

function hasPermission(role: UserRole | undefined, permission: Permission): boolean {
  if (!role) {
    return false;
  }

  return ROLE_PERMISSIONS.get(role)?.includes(permission) ?? false;
}

export { hasPermission, type Permission };
