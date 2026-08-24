import { loadAdminContent } from "../api/loaders";
import { AdminContentRouteComponent } from "../ui/admin-content-route";

export const adminContentRouteOptions = {
	component: AdminContentRouteComponent,
	loader: loadAdminContent,
};
