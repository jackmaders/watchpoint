import { redirect } from "@tanstack/react-router";
import { checkAdminAccess } from "./server-fns";

export async function adminBeforeLoad() {
	try {
		const user = await checkAdminAccess();
		return { unauthorized: false, user };
	} catch (err: unknown) {
		if (err instanceof Response && err.status === 403) {
			return { unauthorized: true, user: null };
		}
		throw redirect({ to: "/" });
	}
}
