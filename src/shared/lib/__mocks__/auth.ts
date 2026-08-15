import { vi } from "vitest";

export { GUEST_USER, GUEST_USER_ID } from "../auth";

export const getAuthConfig = vi.fn();
export const getAuth = vi.fn();
export const getCurrentUser = vi.fn().mockResolvedValue(null);
