import { describe, expect, it } from "vitest";
import { GetAdminAuditLogsSchema, getAdminAuditLogs } from "@/shared/lib/audit";
import {
	GetAdminAuditLogsSchema as ReExportedSchema,
	getAdminAuditLogs as reExportedGetAdminAuditLogs,
} from "../server-fns";

describe("admin-audit server-fns re-exports", () => {
	it("re-exports getAdminAuditLogs and schema from shared/lib/audit", () => {
		// Arrange & Act & Assert
		expect(reExportedGetAdminAuditLogs).toBe(getAdminAuditLogs);
		expect(ReExportedSchema).toBe(GetAdminAuditLogsSchema);
	});
});
