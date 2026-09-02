/**
 * Server functions and payload schemas for fetching administrative audit log entries.
 *
 * Re-exports `getAdminAuditLogs`, `GetAdminAuditLogsSchema`, and `GetAdminAuditLogsPayload`
 * from shared audit utilities for route loader and page consumption.
 */
export {
	type GetAdminAuditLogsPayload,
	GetAdminAuditLogsSchema,
	getAdminAuditLogs,
} from "@/shared/lib/audit";
