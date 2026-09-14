/**
 * Unit test suite verifying input validation, authorization guards, and delegation in the audit server function.
 *
 * Validates `getAdminAuditLogs` using Vitest mocks for `requirePermission` and `queryAuditEntries`, asserting
 * schema parsing compliance, error propagation, and correct result payload mapping.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start");
vi.mock("@/shared/db");
vi.mock("../permissions");

import { queryAuditEntries } from "@/shared/db";
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
		vi.mocked(queryAuditEntries).mockResolvedValueOnce(mockLogs as never);

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
		expect(queryAuditEntries).toHaveBeenCalledWith({
			filter: { entityId: { eq: "vod_1" } },
			limit: 10,
			order: { createdAt: "desc" },
		});
		expect(result).toEqual(mockLogs);
	});

	it("handles undefined payload defaulting to empty object", async () => {
		// Arrange
		vi.mocked(requirePermission).mockResolvedValueOnce(mockAdmin);
		vi.mocked(queryAuditEntries).mockResolvedValueOnce([] as never);

		// Act
		const result = await (
			getAdminAuditLogs as unknown as (ctx: {
				data?: unknown;
			}) => Promise<unknown>
		)({ data: undefined });

		// Assert
		expect(result).toEqual([]);
	});

	it("passes action filter when specified", async () => {
		// Arrange
		vi.mocked(requirePermission).mockResolvedValueOnce(mockAdmin);
		vi.mocked(queryAuditEntries).mockResolvedValueOnce([] as never);

		// Act
		await (
			getAdminAuditLogs as unknown as (ctx: {
				data?: unknown;
			}) => Promise<unknown>
		)({ data: { action: "USER_ROLE_UPDATED" } });

		// Assert
		expect(queryAuditEntries).toHaveBeenCalledWith({
			filter: { action: { eq: "USER_ROLE_UPDATED" } },
			limit: undefined,
			order: { createdAt: "desc" },
		});
	});

	it("passes actorUserId and entityType filters when specified", async () => {
		// Arrange
		vi.mocked(requirePermission).mockResolvedValueOnce(mockAdmin);
		vi.mocked(queryAuditEntries).mockResolvedValueOnce([] as never);

		// Act
		await (
			getAdminAuditLogs as unknown as (ctx: {
				data?: unknown;
			}) => Promise<unknown>
		)({
			data: {
				action: "ALL",
				actorUserId: "usr_123",
				entityType: "VOD",
			},
		});

		// Assert
		expect(queryAuditEntries).toHaveBeenCalledWith({
			filter: {
				actorUserId: { eq: "usr_123" },
				entityType: { eq: "VOD" },
			},
			limit: undefined,
			order: { createdAt: "desc" },
		});
	});

	it("throws error for invalid audit payload", async () => {
		// Arrange & Act & Assert
		await expect(
			(
				getAdminAuditLogs as unknown as (ctx: {
					data: unknown;
				}) => Promise<unknown>
			)({ data: { limit: -1 } }),
		).rejects.toThrow("Invalid audit query payload");
	});
});
