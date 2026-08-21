import { createFileRoute, redirect } from "@tanstack/react-router";
import { getAdminAuditLogs } from "@/pages/admin-audit";
import { AdminVodEditorPage, getAdminVodById } from "@/pages/admin-content";

export const Route = createFileRoute("/admin/content/$vodId")({
	component: AdminVodEditorRouteComponent,
	loader: async ({ params }) => {
		const vod = await getAdminVodById({ data: { id: params.vodId } });
		if (!vod) {
			throw redirect({ to: "/admin/content" });
		}
		const auditEntries = await getAdminAuditLogs({
			data: { entityId: params.vodId },
		});
		return {
			auditEntries: auditEntries ?? [],
			scenarios: (vod as unknown as { scenarios?: unknown[] }).scenarios ?? [],
			vod,
		};
	},
});

export function AdminVodEditorRouteComponent() {
	const { user } = Route.useRouteContext();
	const { auditEntries, scenarios, vod } = Route.useLoaderData();
	if (!user) {
		return null;
	}
	return (
		<AdminVodEditorPage
			auditEntries={auditEntries as never}
			currentUser={user}
			initialScenarios={scenarios as never}
			initialVod={vod}
			isCreate={false}
		/>
	);
}
