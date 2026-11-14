import type { UserRole } from "../db/schema";

type Permission = "todos:read" | "todos:create" | "todos:update" | "todos:delete";

const ROLE_PERMISSIONS = new Map<UserRole, readonly Permission[]>([
  ["admin", ["todos:read", "todos:create", "todos:update", "todos:delete"]],
  ["user", ["todos:read", "todos:create", "todos:update", "todos:delete"]],
]);

function hasPermission(role: UserRole | undefined, permission: Permission): boolean {
  if (!role) {
    return false;
  }

  return ROLE_PERMISSIONS.get(role)?.includes(permission) ?? false;
}

export { hasPermission, type Permission };
