import { loadAdminUsers } from "../api/loaders";
import { AdminUsersRouteComponent } from "../ui/admin-users-route";

export const adminUsersRouteOptions = {
	component: AdminUsersRouteComponent,
	loader: loadAdminUsers,
};
