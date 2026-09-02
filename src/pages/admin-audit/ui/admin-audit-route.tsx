/**
 * Route presentation component for the administrative audit trail page.
 *
 * Implements `AdminAuditRouteComponent` by extracting loaded audit logs and search params from `routeApi`,
 * passing them into `AdminAuditPage` and handling filter updates via router navigation.
 */
import { getRouteApi } from "@tanstack/react-router";
import { useCallback } from "react";
import type { AuditSearchParams } from "../model/search-params";
import { AdminAuditPage } from "./admin-audit-page";

const routeApi = getRouteApi("/admin/audit");

export function AdminAuditRouteComponent() {
	const { logs } = routeApi.useLoaderData();
	const search = routeApi.useSearch() as AuditSearchParams;
	const navigate = routeApi.useNavigate();

	const handleFilterChange = useCallback(
		(next: AuditSearchParams) => {
			navigate({
				search: (prev: Record<string, unknown>) => ({ ...prev, ...next }),
			});
		},
		[navigate],
	);

	return (
		<AdminAuditPage
			initialLogs={logs}
			onFilterChange={handleFilterChange}
			searchParams={search}
		/>
	);
}
