/**
 * Public API for the admin user management and permission administration page slice.
 *
 * Re-exports the public interface of `src/pages/admin-users/` adhering to Feature-Sliced Design (FSD).
 * Exposes loaders, server functions, route options, model rules, and page UI components.
 */
export {
	adminUsersQueryOptions,
	loadAdminUsers,
	useUpdateUserRole,
} from "./api/loaders";
export { adminUsersRouteOptions } from "./model/route-options";
export type { UserItem, UserRole } from "./model/types";
export {
	AdminUsersPage,
	type AdminUsersPageProps,
} from "./ui/admin-users-page";
export { AdminUsersRouteComponent } from "./ui/admin-users-route";
