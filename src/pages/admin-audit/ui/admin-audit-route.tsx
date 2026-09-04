/**
 * Route presentation component for the administrative audit trail page.
 *
 * Connects the TanStack Router route context to the administrative audit log presentation layer,
 * subscribing to live query cache data and synchronizing search filters with URL state.
 *
 * Implements `AdminAuditRouteComponent` by reading route search params, fetching data via
 * `useSuspenseQuery(adminAuditQueryOptions(search))`, and passing the resolved logs to `AdminAuditPage`.
 */
import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useCallback } from "react";
import { adminAuditQueryOptions } from "../api/loaders";
import type { AuditSearchParams } from "../model/search-params";
import { AdminAuditPage } from "./admin-audit-page";

const routeApi = getRouteApi("/admin/audit");

export function AdminAuditRouteComponent() {
	const search = routeApi.useSearch() as AuditSearchParams;
	const navigate = routeApi.useNavigate();
	const { data } = useSuspenseQuery(adminAuditQueryOptions(search));

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
			logs={data ?? []}
			onFilterChange={handleFilterChange}
			searchParams={search}
		/>
	);
}
