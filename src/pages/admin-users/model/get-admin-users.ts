/**
 * Business queries and data resolution for administrative user retrieval.
 *
 * Implements `getAdminUsersRule` querying the database with role filters and in-memory search.
 */

import { queryUsers } from "@/shared/db";
import type { UserItem, UserRole } from "./types";

export async function getAdminUsersRule(
	params?: {
		role?: UserRole;
		search?: string;
	},
	db?: Parameters<typeof queryUsers>[1],
): Promise<UserItem[]> {
	const filter = params?.role ? { role: params.role } : undefined;
	const allUsers = db
		? await queryUsers({ filter }, db)
		: await queryUsers({ filter });

	if (!params?.search?.trim()) {
		return allUsers;
	}

	const search = params.search.toLowerCase().trim();
	return allUsers.filter(
		(u) =>
			u.name.toLowerCase().includes(search) ||
			u.email.toLowerCase().includes(search),
	);
}
