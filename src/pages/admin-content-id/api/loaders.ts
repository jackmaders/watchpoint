/**
 * Data loader for retrieving individual VOD details, scenario collections, and audit logs for editing.
 *
 * Implements `loadAdminContentIdPage` to fetch VOD records via `getAdminVodById` and related audit entries
 * via `getAdminAuditLogs`, redirecting to `/admin/content` if the requested VOD does not exist.
 */
import { redirect } from "@tanstack/react-router";
import { getAdminAuditLogs } from "@/shared/lib/audit";
import { getAdminVodById } from "@/widgets/admin-vod-editor";

export async function loadAdminContentIdPage({
	params,
}: {
	params: { id: string };
}) {
	const vod = await getAdminVodById({ data: { id: params.id } });
	if (!vod) {
		throw redirect({ to: "/admin/content" });
	}
	const auditEntries = await getAdminAuditLogs({
		data: { entityId: params.id },
	});
	return {
		auditEntries: auditEntries ?? [],
		scenarios: vod.scenarios ?? [],
		vod,
	};
}
