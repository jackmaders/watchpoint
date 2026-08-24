import { getRouteApi } from "@tanstack/react-router";
import { AdminContentPage } from "./admin-content-page";

const routeApi = getRouteApi("/admin/content");

export function AdminContentRouteComponent() {
	const { user } = routeApi.useRouteContext();
	const { vods } = routeApi.useLoaderData();
	if (!user) return null;
	return <AdminContentPage currentUser={user} initialVods={vods} />;
}
