import { vi } from "vitest";

export const getAuthConfig = vi.fn();
export const getAuth = vi.fn();
export const getCurrentUser = vi.fn().mockResolvedValue(null);
