import { createMiddleware } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { ensureSession } from "./auth.functions";

export const authMiddleware = createMiddleware({ type: "function" }).server(
	async ({ next }) => {
		try {
			const session = await ensureSession();
			return next({ context: { session } });
		} catch (error) {
			setResponseStatus(401, "Unauthorized");
			throw error;
		}
	},
);
