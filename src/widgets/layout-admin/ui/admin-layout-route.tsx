import { getRouteApi } from "@tanstack/react-router";
import { AdminRouteView } from "./admin-route-view";

const routeApi = getRouteApi("/admin");

export function AdminLayoutRouteComponent() {
	const { unauthorized, user } = routeApi.useRouteContext();
	return <AdminRouteView unauthorized={unauthorized} user={user} />;
}
