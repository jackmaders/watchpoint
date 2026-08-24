import { adminBeforeLoad } from "../api/admin-guard";
import { AdminLayoutRouteComponent } from "../ui/admin-layout-route";

export const adminRouteOptions = {
	beforeLoad: adminBeforeLoad,
	component: AdminLayoutRouteComponent,
};
