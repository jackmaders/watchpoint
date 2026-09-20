import { createServerOnlyFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "./auth.server";

export const ensureSession = createServerOnlyFn(async () => {
	const session = await auth.api.getSession({ headers: getRequestHeaders() });

	if (!session) {
		throw new Error("Unauthorized");
	}

	return session;
});
