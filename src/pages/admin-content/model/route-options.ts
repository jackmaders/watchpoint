/**
 * Route configuration options for the admin content catalog view.
 *
 * Configures `adminContentRouteOptions` binding `loadAdminContent` to `AdminContentRouteComponent`.
 */
import { loadAdminContent } from "../api/loaders";
import { AdminContentRouteComponent } from "../ui/admin-content-route";

export const adminContentRouteOptions = {
	component: AdminContentRouteComponent,
	loader: loadAdminContent,
};
