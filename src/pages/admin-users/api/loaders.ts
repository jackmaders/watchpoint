import { getAdminUsers } from "./server-fns";

export async function loadAdminUsers() {
	const users = await getAdminUsers({ data: {} });
	return { users };
}
