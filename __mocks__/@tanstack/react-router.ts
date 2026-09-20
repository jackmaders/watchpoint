import { vi } from "vitest";

export const createFileRoute = vi.fn(() => vi.fn((options) => ({ options })));
