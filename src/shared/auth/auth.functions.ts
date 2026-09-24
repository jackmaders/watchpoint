import { createMiddleware, createServerOnlyFn } from "@tanstack/react-start";
import {
	getRequestHeaders,
	setResponseStatus,
} from "@tanstack/react-start/server";
import { auth } from "./auth.server";

export const ensureSession = createServerOnlyFn(async () => {
	const session = await auth.api.getSession({ headers: getRequestHeaders() });

	if (!session) {
		throw new Error("Unauthorized");
	}

	return session;
});

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
