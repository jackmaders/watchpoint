import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start");
vi.mock("@/shared/db");
vi.mock("@/shared/lib/permissions");

import { updateUserRole as dbUpdateUserRole, getUsers } from "@/shared/db";
import { requirePermission } from "@/shared/lib/permissions";
import { getAdminUsers, updateUserRole } from "../server-fns";

describe("admin-users server functions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("getAdminUsers", () => {
		it("returns user list when invoked by an Administrator (200 / success)", async () => {
			// Arrange
			const mockUsers = [
				{
					createdAt: new Date(),
					email: "admin@example.com",
					id: "usr_admin",
					name: "Admin User",
					role: "ADMIN",
				},
				{
					createdAt: new Date(),
					email: "player@example.com",
					id: "usr_player",
					name: "Player User",
					role: "PLAYER",
				},
			];
			vi.mocked(requirePermission).mockResolvedValueOnce({
				email: "admin@example.com",
				id: "usr_admin",
				name: "Admin User",
				role: "ADMIN",
			});
			vi.mocked(getUsers).mockResolvedValueOnce({
				data: mockUsers,
				success: true,
			} as never);

			// Act
			const result = await (
				getAdminUsers as unknown as (ctx: {
					data: { role?: "ADMIN" | "PLAYER"; search?: string };
				}) => Promise<unknown>
			)({
				data: { role: "ADMIN", search: "admin" },
			});

			// Assert
			expect(requirePermission).toHaveBeenCalledWith("users:view");
			expect(getUsers).toHaveBeenCalledWith({
				role: "ADMIN",
				search: "admin",
			});
			expect(result).toEqual(mockUsers);
		});

		it("handles undefined data payload cleanly", async () => {
			// Arrange
			vi.mocked(requirePermission).mockResolvedValueOnce({
				email: "admin@example.com",
				id: "usr_admin",
				name: "Admin User",
				role: "ADMIN",
			});
			vi.mocked(getUsers).mockResolvedValueOnce({
				data: [],
				success: true,
			} as never);

			// Act
			const result = await (
				getAdminUsers as unknown as (ctx: { data: unknown }) => Promise<unknown>
			)({ data: undefined });

			// Assert
			expect(result).toEqual([]);
		});

		it("throws error when query payload validation fails", async () => {
			// Arrange
			const invalidPayload = { role: "INVALID_ROLE" };

			// Act & Assert
			await expect(
				(
					getAdminUsers as unknown as (ctx: {
						data: unknown;
					}) => Promise<unknown>
				)({ data: invalidPayload }),
			).rejects.toThrow("Invalid users query payload");
		});

		it("throws 403 Forbidden when invoked by an Ordinary Player", async () => {
			// Arrange
			vi.mocked(requirePermission).mockRejectedValueOnce(
				new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
			);

			// Act & Assert
			await expect(
				(
					getAdminUsers as unknown as (ctx: {
						data: unknown;
					}) => Promise<unknown>
				)({ data: {} }),
			).rejects.toSatisfy((err: unknown) => {
				return err instanceof Response && err.status === 403;
			});
		});

		it("throws 401 Unauthorized when invoked by an Unauthenticated visitor", async () => {
			// Arrange
			vi.mocked(requirePermission).mockRejectedValueOnce(
				new Response(JSON.stringify({ error: "Unauthorized" }), {
					status: 401,
				}),
			);

			// Act & Assert
			await expect(
				(
					getAdminUsers as unknown as (ctx: {
						data: unknown;
					}) => Promise<unknown>
				)({ data: {} }),
			).rejects.toSatisfy((err: unknown) => {
				return err instanceof Response && err.status === 401;
			});
		});

		it("throws 401 Unauthorized when session is expired", async () => {
			// Arrange
			vi.mocked(requirePermission).mockRejectedValueOnce(
				new Response(JSON.stringify({ error: "Unauthorized" }), {
					status: 401,
				}),
			);

			// Act & Assert
			await expect(
				(
					getAdminUsers as unknown as (ctx: {
						data: unknown;
					}) => Promise<unknown>
				)({ data: {} }),
			).rejects.toSatisfy((err: unknown) => {
				return err instanceof Response && err.status === 401;
			});
		});
	});

	describe("updateUserRole", () => {
		it("updates role when invoked by an Administrator (200 / success)", async () => {
			// Arrange
			vi.mocked(requirePermission).mockResolvedValueOnce({
				email: "admin@example.com",
				id: "usr_admin",
				name: "Admin User",
				role: "ADMIN",
			});
			vi.mocked(dbUpdateUserRole).mockResolvedValueOnce({
				data: {
					createdAt: new Date(),
					email: "player@example.com",
					id: "usr_target",
					name: "Target Player",
					role: "ADMIN",
				} as never,
				success: true,
			});

			// Act
			const result = await (
				updateUserRole as unknown as (ctx: {
					data: { newRole: "ADMIN" | "PLAYER"; targetUserId: string };
				}) => Promise<{ success: boolean }>
			)({
				data: { newRole: "ADMIN", targetUserId: "usr_target" },
			});

			// Assert
			expect(requirePermission).toHaveBeenCalledWith("users:manage-roles");
			expect(dbUpdateUserRole).toHaveBeenCalledWith({
				actorUserId: "usr_admin",
				newRole: "ADMIN",
				targetUserId: "usr_target",
			});
			expect(result.success).toBe(true);
		});

		it("throws error when payload validation fails", async () => {
			// Arrange
			const invalidPayload = { newRole: "INVALID_ROLE", targetUserId: "" };

			// Act & Assert
			await expect(
				(
					updateUserRole as unknown as (ctx: {
						data: unknown;
					}) => Promise<unknown>
				)({ data: invalidPayload }),
			).rejects.toThrow("Invalid role update payload");
		});

		it("throws 403 Forbidden when invoked by an Ordinary Player", async () => {
			// Arrange
			vi.mocked(requirePermission).mockRejectedValueOnce(
				new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
			);

			// Act & Assert
			await expect(
				(
					updateUserRole as unknown as (ctx: {
						data: unknown;
					}) => Promise<unknown>
				)({
					data: { newRole: "ADMIN", targetUserId: "usr_target" },
				}),
			).rejects.toSatisfy((err: unknown) => {
				return err instanceof Response && err.status === 403;
			});
		});

		it("throws 401 Unauthorized when unauthenticated or expired", async () => {
			// Arrange
			vi.mocked(requirePermission).mockRejectedValueOnce(
				new Response(JSON.stringify({ error: "Unauthorized" }), {
					status: 401,
				}),
			);

			// Act & Assert
			await expect(
				(
					updateUserRole as unknown as (ctx: {
						data: unknown;
					}) => Promise<unknown>
				)({
					data: { newRole: "ADMIN", targetUserId: "usr_target" },
				}),
			).rejects.toSatisfy((err: unknown) => {
				return err instanceof Response && err.status === 401;
			});
		});
	});
});
