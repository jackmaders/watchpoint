import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/lib/audit");

import { getAdminAuditLogs } from "@/shared/lib/audit";
import { loadAdminAudit } from "../loaders";

describe("admin-audit loaders", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("fetches audit logs with converted query parameters", async () => {
		// Arrange
		const mockLogs = [{ id: "audit_1" }] as never;
		vi.mocked(getAdminAuditLogs).mockResolvedValueOnce(mockLogs);

		// Act
		const result = await loadAdminAudit({
			deps: { action: "VOD_CREATED", search: "test" },
		});

		// Assert
		expect(getAdminAuditLogs).toHaveBeenCalledWith({
			data: { action: "VOD_CREATED", search: "test" },
		});
		expect(result).toEqual({ logs: mockLogs });
	});

	it("falls back to empty array when audit logs return null", async () => {
		// Arrange
		vi.mocked(getAdminAuditLogs).mockResolvedValueOnce(null as never);

		// Act
		const result = await loadAdminAudit({ deps: {} });

		// Assert
		expect(result).toEqual({ logs: [] });
	});
});
