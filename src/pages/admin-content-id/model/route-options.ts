import { loadAdminContentIdPage } from "../api/loaders";
import { AdminContentIdRouteComponent } from "../ui/admin-content-id-route";

export const adminContentIdRouteOptions = {
	component: AdminContentIdRouteComponent,
	loader: loadAdminContentIdPage,
};
