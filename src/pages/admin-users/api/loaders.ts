/**
 * Data loader for retrieving user account records and role assignments.
 *
 * Implements `loadAdminUsers` to query the `getAdminUsers` server function and deliver user listings to route components.
 */
import { getAdminUsers } from "./server-fns";

export async function loadAdminUsers() {
	const users = await getAdminUsers({ data: {} });
	return { users };
}
