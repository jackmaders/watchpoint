import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start");
vi.mock("@/shared/db");
vi.mock("@/shared/lib/permissions");

import { getAuditLogs as dbGetAuditLogs } from "@/shared/db";
import { requirePermission } from "@/shared/lib/permissions";
import { getAdminAuditLogs } from "../server-fns";

describe("admin-audit server functions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("getAdminAuditLogs", () => {
		it("returns audit logs when invoked by authorized administrator", async () => {
			// Arrange
			const mockLogs = [
				{
					action: "VOD_CREATED",
					actor: { email: "admin@example.com", id: "admin_1" },
					actorUserId: "admin_1",
					entityId: "v1",
					entityType: "VOD",
					id: "audit_1",
				},
			];
			vi.mocked(requirePermission).mockResolvedValueOnce({
				id: "admin_1",
				role: "ADMIN",
			});
			vi.mocked(dbGetAuditLogs).mockResolvedValueOnce(mockLogs as never);

			// Act
			const result = await (
				getAdminAuditLogs as unknown as (ctx: {
					data: unknown;
				}) => Promise<unknown>
			)({
				data: {
					actorUserId: "admin_1",
					entityId: "v1",
					entityType: "VOD",
					limit: 10,
					offset: 0,
				},
			});

			// Assert
			expect(requirePermission).toHaveBeenCalledWith("audit:view");
			expect(dbGetAuditLogs).toHaveBeenCalledWith({
				actorUserId: "admin_1",
				entityId: "v1",
				entityType: "VOD",
				limit: 10,
				offset: 0,
			});
			expect(result).toEqual(mockLogs);
		});

		it("handles default undefined payload", async () => {
			// Arrange
			vi.mocked(requirePermission).mockResolvedValueOnce({
				id: "admin_1",
				role: "ADMIN",
			});
			vi.mocked(dbGetAuditLogs).mockResolvedValueOnce([]);

			// Act
			const result = await (
				getAdminAuditLogs as unknown as (ctx: {
					data: unknown;
				}) => Promise<unknown>
			)({ data: undefined });

			// Assert
			expect(result).toEqual([]);
		});

		it("throws error for invalid audit query payload", async () => {
			// Arrange
			const invalid = { limit: -5 };

			// Act & Assert
			await expect(
				(
					getAdminAuditLogs as unknown as (ctx: {
						data: unknown;
					}) => Promise<unknown>
				)({ data: invalid }),
			).rejects.toThrow("Invalid audit query payload");
		});

		it("throws 403 Forbidden when invoked by regular player", async () => {
			// Arrange
			vi.mocked(requirePermission).mockRejectedValueOnce(
				new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
			);

			// Act & Assert
			await expect(
				(
					getAdminAuditLogs as unknown as (ctx: {
						data: unknown;
					}) => Promise<unknown>
				)({ data: {} }),
			).rejects.toSatisfy((res: Response) => res.status === 403);
		});

		it("throws 401 Unauthorized when invoked without session", async () => {
			// Arrange
			vi.mocked(requirePermission).mockRejectedValueOnce(
				new Response(JSON.stringify({ error: "Unauthorized" }), {
					status: 401,
				}),
			);

			// Act & Assert
			await expect(
				(
					getAdminAuditLogs as unknown as (ctx: {
						data: unknown;
					}) => Promise<unknown>
				)({ data: {} }),
			).rejects.toSatisfy((res: Response) => res.status === 401);
		});
	});
});
