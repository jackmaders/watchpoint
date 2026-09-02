/**
 * Route presentation component for the admin VOD content editor view.
 *
 * Implements `AdminContentIdRouteComponent` by reading loaded VOD, scenario, and audit details from `routeApi`
 * and rendering the `AdminVodEditorPage` widget.
 */
import { getRouteApi } from "@tanstack/react-router";
import { AdminVodEditorPage } from "@/widgets/admin-vod-editor";

const routeApi = getRouteApi("/admin/content/$id");

export function AdminContentIdRouteComponent() {
	const { auditEntries, scenarios, vod } = routeApi.useLoaderData();
	return (
		<AdminVodEditorPage
			auditEntries={auditEntries}
			initialScenarios={scenarios}
			initialVod={vod}
		/>
	);
}
