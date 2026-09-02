/**
 * Data loader for retrieving administrative audit trail records filtered by search parameters.
 *
 * Implements `loadAdminAudit` to map `AuditSearchParams` dependencies and query `getAdminAuditLogs`,
 * returning matching audit log records and associated actor details.
 */
import { getAdminAuditLogs } from "@/shared/lib/audit";
import type { AuditSearchParams } from "../model/search-params";
import { toGetAdminAuditLogsQuery } from "../model/search-params";

export async function loadAdminAudit({ deps }: { deps: AuditSearchParams }) {
	const logs = await getAdminAuditLogs({
		data: toGetAdminAuditLogsQuery(deps),
	});
	return { logs: logs ?? [] };
}
