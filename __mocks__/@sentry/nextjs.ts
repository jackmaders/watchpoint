import { vi } from "vitest";

export const captureException = vi.fn().mockReturnValue("mock-event-id");
export const captureMessage = vi.fn().mockReturnValue("mock-event-id");
export const captureRequestError = vi.fn();
export const captureRouterTransitionStart = vi.fn();
export const init = vi.fn();
export const withSentryConfig = vi.fn((config) => config);
