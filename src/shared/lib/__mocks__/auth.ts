/**
 * Test mock for server-side authentication utilities, enabling controlled session and permission testing.
 *
 * Implements Vitest mock functions for `getAuthConfig`, `getAuth`, `getCurrentUser`, and `isRegistrationOpen`,
 * returning predictable mock user profiles and configuration objects during test execution.
 */

import { vi } from "vitest";

export const getAuthConfig = vi.fn();
export const getAuth = vi.fn();
export const getCurrentUser = vi.fn().mockResolvedValue(null);
export const isRegistrationOpen = vi.fn().mockResolvedValue(true);
export const handleAuthRequest = vi.fn();
export const authApiRouteOptions = {
	server: {
		handlers: {
			GET: handleAuthRequest,
			POST: handleAuthRequest,
		},
	},
};
