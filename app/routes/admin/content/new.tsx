import { createFileRoute } from "@tanstack/react-router";
import { AdminVodEditorPage } from "@/pages/admin-content";

export const Route = createFileRoute("/admin/content/new")({
	component: AdminNewVodRouteComponent,
});

export function AdminNewVodRouteComponent() {
	const { user } = Route.useRouteContext();
	if (!user) {
		return null;
	}
	return (
		<AdminVodEditorPage
			currentUser={user}
			initialScenarios={[]}
			initialVod={null}
			isCreate
		/>
	);
}
