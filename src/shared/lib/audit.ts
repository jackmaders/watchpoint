/**
 * Exposes a cross-cutting server function to query structured administrative audit logs,
 * enabling authorized administrative interfaces to inspect system mutations and governance events.
 *
 * Implements `getAdminAuditLogs` as an authenticated TanStack Start server function using `createServerFn`.
 * Enforces the `audit:view` capability via `requirePermission`, validates query pagination and filter parameters
 * through `GetAdminAuditLogsSchema`, and delegates retrieval to `auditService.list` in the shared database layer.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { type AuditEntryItem, auditService } from "@/shared/db";
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
	.handler(async ({ data }): Promise<AuditEntryItem[]> => {
		await requirePermission("audit:view");
		const result = await auditService.list(data);
		if (!result.success) {
			throw new Error(`Failed to query audit logs: ${result.error}`);
		}
		return result.data.items;
	});
