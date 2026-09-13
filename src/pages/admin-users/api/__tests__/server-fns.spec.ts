import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start");
vi.mock("@/shared/lib/permissions");
vi.mock("../../model/get-admin-users");
vi.mock("../../model/update-user-role");

import { requirePermission } from "@/shared/lib/permissions";
import { getAdminUsersRule } from "../../model/get-admin-users";
import { updateUserRoleRule } from "../../model/update-user-role";
import { getAdminUsers, updateUserRole } from "../server-fns";

describe("admin-users server functions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("getAdminUsers", () => {
		it("returns user list when invoked by an Administrator", async () => {
			// Arrange
			const mockUsers = [
				{
					createdAt: new Date(),
					email: "admin@example.com",
					id: "usr_admin",
					name: "Admin User",
					role: "ADMIN" as const,
				},
			];
			vi.mocked(requirePermission).mockResolvedValueOnce({
				email: "admin@example.com",
				id: "usr_admin",
				name: "Admin User",
				role: "ADMIN",
			});
			vi.mocked(getAdminUsersRule).mockResolvedValueOnce(mockUsers as never);

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
			expect(getAdminUsersRule).toHaveBeenCalledWith({
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
			vi.mocked(getAdminUsersRule).mockResolvedValueOnce([]);

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

		it("throws 403 Forbidden when permission check fails", async () => {
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
	});

	describe("updateUserRole", () => {
		it("delegates to updateUserRoleRule when invoked with valid input", async () => {
			// Arrange
			vi.mocked(requirePermission).mockResolvedValueOnce({
				email: "admin@example.com",
				id: "usr_admin",
				name: "Admin User",
				role: "ADMIN",
			});
			vi.mocked(updateUserRoleRule).mockResolvedValueOnce({
				status: "success",
				user: {
					createdAt: new Date(),
					email: "player@example.com",
					id: "usr_target",
					name: "Target Player",
					role: "ADMIN",
				} as never,
			});

			// Act
			const result = await (
				updateUserRole as unknown as (ctx: {
					data: { newRole: "ADMIN" | "PLAYER"; targetUserId: string };
				}) => Promise<{ status: string }>
			)({
				data: { newRole: "ADMIN", targetUserId: "usr_target" },
			});

			// Assert
			expect(requirePermission).toHaveBeenCalledWith("users:manage-roles");
			expect(updateUserRoleRule).toHaveBeenCalledWith({
				actorUserId: "usr_admin",
				newRole: "ADMIN",
				targetUserId: "usr_target",
			});
			expect(result.status).toBe("success");
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

		it("throws 403 Forbidden when actor lacks permission", async () => {
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
	});
});
