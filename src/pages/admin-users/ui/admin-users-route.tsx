/**
 * Route presentation component for the admin user management view.
 *
 * Implements `AdminUsersRouteComponent` extracting authenticated user context and loader data
 * from `routeApi` and rendering `AdminUsersPage`.
 */
import { getRouteApi } from "@tanstack/react-router";
import { AdminUsersPage } from "./admin-users-page";

const routeApi = getRouteApi("/admin/users");

export function AdminUsersRouteComponent() {
	const { user } = routeApi.useRouteContext();
	const { users } = routeApi.useLoaderData();
	if (!user) return null;
	return <AdminUsersPage currentUser={user} initialUsers={users} />;
}
