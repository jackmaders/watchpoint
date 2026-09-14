import {
	GetAdminAuditLogsSchema as BaseSchema,
	getAdminAuditLogs as baseServerFn,
	type GetAdminAuditLogsPayload,
} from "@/shared/lib/audit";

export const getAdminAuditLogs = baseServerFn;
export const GetAdminAuditLogsSchema = BaseSchema;
export type { GetAdminAuditLogsPayload };
