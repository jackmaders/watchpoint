import { vi } from "vitest";

export const captureException = vi.fn().mockReturnValue("mock-event-id");
export const captureMessage = vi.fn().mockReturnValue("mock-event-id");
export const init = vi.fn();
