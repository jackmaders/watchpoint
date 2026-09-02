/**
 * Unit test suite verifying role-based access control evaluations and authorization enforcement guards.
 *
 * Validates `hasPermission`, `getUserPermissions`, and `requirePermission` against `ADMIN` and `PLAYER`
 * roles, ensuring unauthorized requests throw appropriate 401/403 HTTP response exceptions.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../auth");

import { getCurrentUser } from "../auth";
import {
	getUserPermissions,
	hasPermission,
	PERMISSIONS,
	requirePermission,
} from "../permissions";

describe("permissions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns true when ADMIN checks assigned capabilities", () => {
		// Arrange
		const role = "ADMIN";

		// Act & Assert
		expect(hasPermission(role, PERMISSIONS.ADMIN_ACCESS)).toBe(true);
		expect(hasPermission(role, PERMISSIONS.USERS_MANAGE_ROLES)).toBe(true);
		expect(hasPermission(role, PERMISSIONS.USERS_VIEW)).toBe(true);
		expect(hasPermission(role, PERMISSIONS.AUDIT_VIEW)).toBe(true);
		expect(hasPermission(role, PERMISSIONS.CATALOG_MANAGE)).toBe(true);
		expect(hasPermission(role, PERMISSIONS.CATALOG_PUBLISH)).toBe(true);
	});

	it("returns false when PLAYER checks administrative capabilities", () => {
		// Arrange
		const role = "PLAYER";

		// Act & Assert
		expect(hasPermission(role, PERMISSIONS.ADMIN_ACCESS)).toBe(false);
		expect(hasPermission(role, PERMISSIONS.USERS_MANAGE_ROLES)).toBe(false);
		expect(hasPermission(role, PERMISSIONS.USERS_VIEW)).toBe(false);
		expect(hasPermission(role, PERMISSIONS.AUDIT_VIEW)).toBe(false);
		expect(hasPermission(role, PERMISSIONS.CATALOG_MANAGE)).toBe(false);
		expect(hasPermission(role, PERMISSIONS.CATALOG_PUBLISH)).toBe(false);
	});

	it("returns false for undefined, null, or unknown roles", () => {
		// Arrange
		const nullRole = null;
		const undefinedRole = undefined;

		// Act & Assert
		expect(hasPermission(nullRole, "admin:access")).toBe(false);
		expect(hasPermission(undefinedRole, "admin:access")).toBe(false);
		expect(hasPermission("UNKNOWN" as never, "admin:access")).toBe(false);
	});

	it("returns all permissions for ADMIN role", () => {
		// Arrange & Act
		const permissions = getUserPermissions("ADMIN");

		// Assert
		expect(permissions).toEqual([
			"admin:access",
			"users:manage-roles",
			"users:view",
			"audit:view",
			"catalog:manage",
			"catalog:publish",
		]);
	});

	it("returns empty permissions array for PLAYER, null, or invalid role", () => {
		// Arrange & Act
		const playerPerms = getUserPermissions("PLAYER");
		const nullPerms = getUserPermissions(null);
		const invalidPerms = getUserPermissions("INVALID" as never);

		// Assert
		expect(playerPerms).toEqual([]);
		expect(nullPerms).toEqual([]);
		expect(invalidPerms).toEqual([]);
	});

	it("requirePermission succeeds for user with required capability", async () => {
		// Arrange
		vi.mocked(getCurrentUser).mockResolvedValueOnce({
			email: "admin@example.com",
			id: "usr_admin",
			name: "Admin User",
			role: "ADMIN",
		});

		// Act
		const user = await requirePermission("users:manage-roles");

		// Assert
		expect(user).toEqual({
			email: "admin@example.com",
			id: "usr_admin",
			name: "Admin User",
			role: "ADMIN",
		});
	});

	it("requirePermission throws 401 Response when user is unauthenticated", async () => {
		// Arrange
		vi.mocked(getCurrentUser).mockResolvedValueOnce(null);

		// Act & Assert
		await expect(requirePermission("admin:access")).rejects.toSatisfy(
			(err: unknown) => {
				return err instanceof Response && err.status === 401;
			},
		);
	});

	it("requirePermission throws 403 Response when user lacks capability", async () => {
		// Arrange
		vi.mocked(getCurrentUser).mockResolvedValueOnce({
			email: "player@example.com",
			id: "usr_player",
			name: "Player User",
			role: "PLAYER",
		});

		// Act & Assert
		await expect(requirePermission("users:manage-roles")).rejects.toSatisfy(
			(err: unknown) => {
				return err instanceof Response && err.status === 403;
			},
		);
	});

	it("passes headers and context to getCurrentUser", async () => {
		// Arrange
		const headers = new Headers({ cookie: "session=xyz" });
		vi.mocked(getCurrentUser).mockResolvedValueOnce({
			email: "admin@example.com",
			id: "usr_admin",
			name: "Admin User",
			role: "ADMIN",
		});

		// Act
		await requirePermission("admin:access", headers);

		// Assert
		expect(getCurrentUser).toHaveBeenCalledWith(headers, undefined);
	});
});
