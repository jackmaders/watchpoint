import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router");
vi.mock("@/widgets/admin-vod-editor");
vi.mock("@/shared/lib/audit");

import { redirect } from "@tanstack/react-router";
import { getAdminAuditLogs } from "@/shared/lib/audit";
import { getAdminVodById } from "@/widgets/admin-vod-editor";
import { loadAdminContentIdPage } from "../loaders";

describe("admin-content-id loaders", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("redirects to /admin/content when vod is not found", async () => {
		// Arrange
		vi.mocked(getAdminVodById).mockResolvedValueOnce(null as never);

		// Act & Assert
		await expect(
			loadAdminContentIdPage({ params: { id: "vod_missing" } }),
		).rejects.toThrow();
		expect(redirect).toHaveBeenCalledWith({ to: "/admin/content" });
	});

	it("loads vod and audit logs on success", async () => {
		// Arrange
		const mockVod = {
			id: "vod_1",
			scenarios: [{ id: "sc_1" }],
			title: "VOD 1",
		};
		const mockAudit = [{ action: "UPDATE", id: "aud_1" }];
		vi.mocked(getAdminVodById).mockResolvedValueOnce(mockVod as never);
		vi.mocked(getAdminAuditLogs).mockResolvedValueOnce(mockAudit as never);

		// Act
		const result = await loadAdminContentIdPage({ params: { id: "vod_1" } });

		// Assert
		expect(result).toEqual({
			auditEntries: mockAudit,
			scenarios: [{ id: "sc_1" }],
			vod: mockVod,
		});
	});

	it("falls back to empty arrays when scenarios or audit entries are missing", async () => {
		// Arrange
		const mockVod = {
			id: "vod_1",
			title: "VOD 1",
		};
		vi.mocked(getAdminVodById).mockResolvedValueOnce(mockVod as never);
		vi.mocked(getAdminAuditLogs).mockResolvedValueOnce(null as never);

		// Act
		const result = await loadAdminContentIdPage({ params: { id: "vod_1" } });

		// Assert
		expect(result).toEqual({
			auditEntries: [],
			scenarios: [],
			vod: mockVod,
		});
	});
});
