import { createServerFn } from "@tanstack/react-start";
import { adminMiddleware } from "./admin-middleware";

export const requireAdminServerFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.handler(({ context }) => context.session);
