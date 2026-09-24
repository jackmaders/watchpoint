import { isNotFound, isRedirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import { ServerFunctionError } from "@/shared/errors";
import { ensureSession } from "./auth.functions";
import { hasAdminPermission } from "./auth-roles";

export const adminMiddleware = createMiddleware({ type: "function" }).server(
	async ({ next }) => {
		try {
			const session = await ensureSession();

			if (!hasAdminPermission(session.user)) {
				throw new ServerFunctionError("Forbidden", 403);
			}

			return next({ context: { session } });
		} catch (error) {
			if (isRedirect(error) || isNotFound(error)) {
				throw error;
			}

			if (error instanceof ServerFunctionError) {
				throw error;
			}

			throw new ServerFunctionError("Unauthorized", 401);
		}
	},
);
