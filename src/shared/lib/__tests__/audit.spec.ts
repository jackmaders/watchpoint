import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start");
vi.mock("@/shared/db");
vi.mock("../permissions");

import { getAuditLogs as dbGetAuditLogs } from "@/shared/db";
import { getAdminAuditLogs } from "../audit";
import { requirePermission } from "../permissions";

describe("shared audit server function", () => {
	const mockAdmin = {
		createdAt: new Date(),
		email: "admin@example.com",
		id: "usr_admin",
		name: "Admin",
		role: "ADMIN" as const,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("validates and queries audit logs with required permission", async () => {
		// Arrange
		const mockLogs = [{ action: "UPDATE", id: "audit_1" }];
		vi.mocked(requirePermission).mockResolvedValueOnce(mockAdmin);
		vi.mocked(dbGetAuditLogs).mockResolvedValueOnce({
			data: mockLogs,
			success: true,
		} as never);

		// Act
		const result = await (
			getAdminAuditLogs as unknown as (ctx: {
				data: { entityId: string; limit: number; offset: number };
			}) => Promise<unknown>
		)({
			data: { entityId: "vod_1", limit: 10, offset: 0 },
		});

		// Assert
		expect(requirePermission).toHaveBeenCalledWith("audit:view");
		expect(dbGetAuditLogs).toHaveBeenCalledWith({
			entityId: "vod_1",
			limit: 10,
			offset: 0,
		});
		expect(result).toEqual(mockLogs);
	});

	it("handles undefined payload defaulting to empty object", async () => {
		// Arrange
		vi.mocked(requirePermission).mockResolvedValueOnce(mockAdmin);
		vi.mocked(dbGetAuditLogs).mockResolvedValueOnce({
			data: [],
			success: true,
		} as never);

		// Act
		const result = await (
			getAdminAuditLogs as unknown as (ctx: {
				data?: unknown;
			}) => Promise<unknown>
		)({ data: undefined });

		// Assert
		expect(result).toEqual([]);
	});

	it("throws error when query fails", async () => {
		// Arrange
		vi.mocked(requirePermission).mockResolvedValueOnce(mockAdmin);
		vi.mocked(dbGetAuditLogs).mockResolvedValueOnce({
			error: "Database error",
			success: false,
		} as never);

		// Act & Assert
		await expect(
			(
				getAdminAuditLogs as unknown as (ctx: {
					data?: unknown;
				}) => Promise<unknown>
			)({ data: undefined }),
		).rejects.toThrow("Failed to query audit logs: Database error");
	});

	it("throws error for invalid audit payload", async () => {
		// Arrange & Act & Assert
		await expect(
			(
				getAdminAuditLogs as unknown as (ctx: {
					data: { limit: number };
				}) => Promise<unknown>
			)({
				data: { limit: -5 },
			}),
		).rejects.toThrow("Invalid audit query payload");
	});
});
