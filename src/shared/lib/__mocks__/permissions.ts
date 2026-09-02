/**
 * Test mock for role-based permission verification and capability enforcement guards.
 *
 * Exports mocked implementations of `hasPermission`, `getUserPermissions`, and `requirePermission` alongside
 * authentic `PERMISSIONS` constants, defaulting authorization checks to pass with mock admin credentials.
 */

import { vi } from "vitest";
import { PERMISSIONS, ROLE_PERMISSIONS } from "../permissions";

export { PERMISSIONS, ROLE_PERMISSIONS };
export const hasPermission = vi.fn((role, _permission) => {
	if (role === "ADMIN") return true;
	return false;
});
export const getUserPermissions = vi.fn((role) => {
	if (role === "ADMIN") return Object.values(PERMISSIONS);
	return [];
});
export const requirePermission = vi.fn().mockResolvedValue({
	email: "mock@example.com",
	id: "mock_user_id",
	name: "Mock User",
	role: "ADMIN",
});
