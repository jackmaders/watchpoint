/**
 * Route options and loader bindings for the admin user management view.
 *
 * Configures `adminUsersRouteOptions` linking `loadAdminUsers` to `AdminUsersRouteComponent`.
 */
import { loadAdminUsers } from "../api/loaders";
import { AdminUsersRouteComponent } from "../ui/admin-users-route";

export const adminUsersRouteOptions = {
	component: AdminUsersRouteComponent,
	loader: loadAdminUsers,
};
