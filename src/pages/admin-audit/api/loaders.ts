/**
 * Data loading and query options for retrieving administrative audit trail records.
 *
 * Pre-warms and retrieves system activity and security audit trail entries across administrative
 * workflows, ensuring synchronized cache hydration and responsive filtering across the audit log.
 *
 * Implements `adminAuditQueryOptions` and `loadAdminAudit` using `@tanstack/react-query` and `queryKeys.audit`.
 * Executes `getAdminAuditLogs` server functions and pre-populates the query client cache using `staleTime: "static"`.
 */
import type { QueryClient } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api";
import { getAdminAuditLogs } from "@/shared/lib/audit";
import type { AuditSearchParams } from "../model/search-params";
import { toGetAdminAuditLogsQuery } from "../model/search-params";

export const adminAuditQueryOptions = (params?: AuditSearchParams) =>
	queryOptions({
		queryFn: () =>
			getAdminAuditLogs({
				data: toGetAdminAuditLogsQuery(params ?? {}),
			}),
		queryKey:
			params && Object.keys(params).length > 0
				? ([...queryKeys.audit, params] as const)
				: queryKeys.audit,
	});

/** Warms the audit query cache on server or navigation before rendering. */
export async function loadAdminAudit({
	context,
	deps,
}: {
	context: { queryClient: QueryClient };
	deps: AuditSearchParams;
}) {
	await context.queryClient.query({
		...adminAuditQueryOptions(deps),
		staleTime: "static",
	});
}
