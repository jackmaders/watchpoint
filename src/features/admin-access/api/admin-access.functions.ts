import { createServerFn } from "@tanstack/react-start";
import { adminMiddleware } from "@/shared/auth";

export const requireAdminServerFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.handler(({ context }) => context.session);
