import { describe, expect, it, vi } from "vitest";
import { captureException, captureMessage } from "./sentry";

vi.mock("@sentry/react");

describe("sentry shared library", () => {
	it("captures exception correctly", async () => {
		// Arrange
		const sentry = await import("@sentry/react");
		vi.mocked(sentry.captureException).mockReturnValue("event-id-123");
		const testError = new Error("Test Sentry Error");

		// Act
		const eventId = captureException(testError);

		// Assert
		expect(sentry.captureException).toHaveBeenCalledWith(testError, undefined);
		expect(eventId).toBe("event-id-123");
	});

	it("captures message correctly", async () => {
		// Arrange
		const sentry = await import("@sentry/react");
		vi.mocked(sentry.captureMessage).mockReturnValue("event-id-456");

		// Act
		const eventId = captureMessage("Test message");

		// Assert
		expect(sentry.captureMessage).toHaveBeenCalledWith(
			"Test message",
			undefined,
		);
		expect(eventId).toBe("event-id-456");
	});
});
