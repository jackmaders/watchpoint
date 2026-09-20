import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth";

async function readSession() {
	return auth.api.getSession({ headers: getRequestHeaders() });
}

export const ensureSession = createServerFn({ method: "GET" }).handler(
	async () => {
		const session = await readSession();

		if (!session) {
			throw new Error("Unauthorized");
		}

		return session;
	},
);
