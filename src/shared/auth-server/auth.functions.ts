import { createServerOnlyFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "./auth";

async function readSession() {
	return auth.api.getSession({ headers: getRequestHeaders() });
}

export const ensureSession = createServerOnlyFn(async () => {
	const session = await readSession();

	if (!session) {
		throw new Error("Unauthorized");
	}

	return session;
});
