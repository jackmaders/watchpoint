import { createServerOnlyFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "./auth.server";

export const getSession = createServerOnlyFn(async () => {
	return await auth.api.getSession({ headers: getRequestHeaders() });
});

export const ensureSession = createServerOnlyFn(async () => {
	const session = await getSession();

	if (!session) {
		throw new Error("Unauthorized");
	}

	return session;
});
