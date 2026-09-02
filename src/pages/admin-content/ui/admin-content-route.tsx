/**
 * Route component adapter for the administrative content management page.
 *
 * Implements `AdminContentRouteComponent` extracting authenticated user context and loader data
 * from `routeApi` and rendering `AdminContentPage`.
 */
import { getRouteApi } from "@tanstack/react-router";
import { AdminContentPage } from "./admin-content-page";

const routeApi = getRouteApi("/admin/content");

export function AdminContentRouteComponent() {
	const { user } = routeApi.useRouteContext();
	const { vods } = routeApi.useLoaderData();
	if (!user) return null;
	return <AdminContentPage currentUser={user} initialVods={vods} />;
}
