import { vi } from "vitest";
import { dbSuccess } from "../../core/result";

export const createAuditEntry = vi.fn(async () => dbSuccess(null));
export const getAuditEntries = vi.fn(async () => dbSuccess([]));
export const getAuditLogs = vi.fn(async () => dbSuccess([]));
