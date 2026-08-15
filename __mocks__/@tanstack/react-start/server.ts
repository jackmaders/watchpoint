import { vi } from "vitest";

export const getRequestHeaders = vi.fn();
export const createStartHandler = vi.fn(() => vi.fn());
export const defaultStreamHandler = vi.fn();
export const defaultRenderHandler = vi.fn();
