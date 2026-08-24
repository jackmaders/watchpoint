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
