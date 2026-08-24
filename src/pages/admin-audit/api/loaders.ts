import { getAdminAuditLogs } from "@/shared/lib/audit";
import type { AuditSearchParams } from "../model/search-params";
import { toGetAdminAuditLogsQuery } from "../model/search-params";

export async function loadAdminAudit({ deps }: { deps: AuditSearchParams }) {
	const logs = await getAdminAuditLogs({
		data: toGetAdminAuditLogsQuery(deps),
	});
	return { logs: logs ?? [] };
}
