import { vi } from "vitest";

export const GUEST_USER_ID = "usr_guest_demo";

export const GUEST_USER = {
	email: "guest@watchpoint.gg",
	id: GUEST_USER_ID,
	name: "Guest Cadet",
} as const;

export const getAuthConfig = vi.fn();
export const getAuth = vi.fn();
export const getCurrentUser = vi.fn().mockResolvedValue(null);
