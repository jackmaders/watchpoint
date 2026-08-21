import { z } from "zod";

export const auditSearchSchema = z.object({
	action: z.string().optional(),
	search: z.string().optional(),
});

export type AuditSearchParams = z.infer<typeof auditSearchSchema>;

export function validateAuditSearch(
	search?: Record<string, unknown>,
): AuditSearchParams {
	if (!search || typeof search !== "object") {
		return {};
	}
	const parsed = auditSearchSchema.safeParse(search);
	if (parsed.success) {
		return parsed.data;
	}
	return {};
}

export function toGetAdminAuditLogsQuery(params: AuditSearchParams) {
	return {
		action:
			params.action && params.action !== "ALL" ? params.action : undefined,
		search: params.search,
	};
}
