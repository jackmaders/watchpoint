/**
 * Route presentation component for the admin user management view.
 *
 * Implements `AdminUsersRouteComponent` extracting authenticated user context and loader data
 * from `routeApi` and rendering `AdminUsersPage`.
 */
import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { adminUsersQueryOptions } from "../api/loaders";
import { AdminUsersPage } from "./admin-users-page";

const routeApi = getRouteApi("/admin/users");

export function AdminUsersRouteComponent() {
	const { user } = routeApi.useRouteContext();
	const { data: users } = useSuspenseQuery(adminUsersQueryOptions());
	if (!user) return null;
	return <AdminUsersPage currentUser={user} users={users ?? []} />;
}
