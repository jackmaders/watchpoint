import { createMiddleware } from "@tanstack/react-start";

import { userRoles } from "../db/schema";
import { ApplicationError } from "../errors";
import { hasPermission, type Permission } from "./permissions";
import { ensureSession } from "./session.server";

function permissionMiddleware(permission: Permission) {
  return createMiddleware({
    type: "function",
  }).server(async ({ next }) => {
    const { session, user } = await ensureSession();
    const { role } = user;

    if (!userRoles.includes(role)) {
      throw new ApplicationError("USER_FORBIDDEN");
    }

    if (!hasPermission(role, permission)) {
      throw new ApplicationError("USER_FORBIDDEN");
    }

    return await next({ context: { session, user } });
  });
}

export { permissionMiddleware };
