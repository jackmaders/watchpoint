import { isNotFound, isRedirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { ensureSession } from "./auth.functions";

export const authMiddleware = createMiddleware({ type: "function" }).server(
	async ({ next }) => {
		try {
			const session = await ensureSession();
			return next({ context: { session } });
		} catch (error) {
			if (isRedirect(error)) throw error;
			if (isNotFound(error)) throw error;

			setResponseStatus(401, "Unauthorized");
			throw error;
		}
	},
);
