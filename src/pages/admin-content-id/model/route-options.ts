/**
 * Route options and loader bindings for the admin content editor view.
 *
 * Defines `adminContentIdRouteOptions` binding `loadAdminContentIdPage` to `AdminContentIdRouteComponent`.
 */
import { loadAdminContentIdPage } from "../api/loaders";
import { AdminContentIdRouteComponent } from "../ui/admin-content-id-route";

export const adminContentIdRouteOptions = {
	component: AdminContentIdRouteComponent,
	loader: loadAdminContentIdPage,
};
