import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { type auditEntries, getAuditLogs as dbGetAuditLogs } from "@/shared/db";
import { requirePermission } from "./permissions";

export const GetAdminAuditLogsSchema = z.object({
	actorUserId: z.string().optional(),
	entityId: z.string().optional(),
	entityType: z.string().optional(),
	limit: z.number().int().positive().optional(),
	offset: z.number().int().nonnegative().optional(),
});

export type GetAdminAuditLogsPayload = z.infer<typeof GetAdminAuditLogsSchema>;

export const getAdminAuditLogs = createServerFn({ method: "GET" })
	.validator((data: unknown) => {
		const parsed = GetAdminAuditLogsSchema.safeParse(data ?? {});
		if (!parsed.success) {
			throw new Error("Invalid audit query payload");
		}
		return parsed.data;
	})
	.handler(
		async ({ data }): Promise<Array<typeof auditEntries.$inferSelect>> => {
			await requirePermission("audit:view");
			const result = await dbGetAuditLogs(data);
			if (!result.success) {
				throw new Error(`Failed to query audit logs: ${result.error}`);
			}
			return result.data.items;
		},
	);
