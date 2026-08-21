import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";
import {
	AdminAuditPage,
	type AuditSearchParams,
	getAdminAuditLogs,
	toGetAdminAuditLogsQuery,
	validateAuditSearch,
} from "@/pages/admin-audit";

export const Route = createFileRoute("/admin/audit")({
	component: AdminAuditRouteComponent,
	loader: async ({ deps }: { deps: AuditSearchParams }) => {
		const logs = await getAdminAuditLogs({
			data: toGetAdminAuditLogsQuery(deps),
		});
		return { logs };
	},
	loaderDeps: ({ search }) => search,
	validateSearch: validateAuditSearch,
});

export function AdminAuditRouteComponent() {
	const { user } = Route.useRouteContext();
	const { logs } = Route.useLoaderData();
	const search = Route.useSearch() as AuditSearchParams;
	const navigate = Route.useNavigate();

	const handleFilterChange = useCallback(
		(newParams: AuditSearchParams) => {
			navigate({
				search: (prev) => ({
					...prev,
					...newParams,
				}),
				to: ".",
			});
		},
		[navigate],
	);

	if (!user) {
		return null;
	}

	return (
		<AdminAuditPage
			initialLogs={logs}
			onFilterChange={handleFilterChange}
			searchParams={search}
		/>
	);
}
