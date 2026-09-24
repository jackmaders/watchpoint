import { isNotFound, isRedirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { ensureSession } from "./auth.functions";
import { isAdmin } from "./auth-roles";

export const adminMiddleware = createMiddleware({ type: "function" }).server(
	async ({ next }) => {
		let session: Awaited<ReturnType<typeof ensureSession>>;

		try {
			session = await ensureSession();
		} catch (error) {
			if (isRedirect(error) || isNotFound(error)) {
				throw error;
			}

			setResponseStatus(401, "Unauthorized");
			throw error;
		}

		if (!isAdmin(session.user)) {
			setResponseStatus(403, "Forbidden");
			throw new Error("Forbidden");
		}

		return next({ context: { session } });
	},
);
