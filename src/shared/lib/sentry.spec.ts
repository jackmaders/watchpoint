import { describe, expect, it, vi } from "vitest";
import { captureException, captureMessage } from "./sentry";

vi.mock("@sentry/nextjs");

describe("sentry shared library", () => {
	it("captures exception correctly", async () => {
		const sentry = await import("@sentry/nextjs");
		vi.mocked(sentry.captureException).mockReturnValue("event-id-123");

		const testError = new Error("Test Sentry Error");
		const eventId = captureException(testError);

		expect(sentry.captureException).toHaveBeenCalledWith(testError, undefined);
		expect(eventId).toBe("event-id-123");
	});

	it("captures message correctly", async () => {
		const sentry = await import("@sentry/nextjs");
		vi.mocked(sentry.captureMessage).mockReturnValue("event-id-456");

		const eventId = captureMessage("Test message");

		expect(sentry.captureMessage).toHaveBeenCalledWith(
			"Test message",
			undefined,
		);
		expect(eventId).toBe("event-id-456");
	});
});
