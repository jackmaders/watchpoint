import { describe, expect, it } from "vitest";
import { RecordAttemptInputSchema } from "../attempt";

describe("RecordAttemptInputSchema", () => {
	it("parses valid attempt input payload", () => {
		// Arrange
		const valid = {
			idempotencyKey: "7b3b7f7e-4f3c-4f84-8a0d-5e3a4f7f2c91",
			inputValue: { key: "value" },
			isCorrect: true,
			isTimedOut: false,
			playthroughId: "pt_1",
			responseTimeMs: 1500,
			scenarioId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
			scenarioSnapshotId: "snap_1",
			selectedOptionId: "opt_1",
		};

		// Act
		const parsed = RecordAttemptInputSchema.safeParse(valid);

		// Assert
		expect(parsed.success).toBe(true);
	});

	it("rejects invalid attempt input payload", () => {
		// Arrange
		const invalid = {
			idempotencyKey: "not-a-uuid",
			isCorrect: true,
			responseTimeMs: -1,
			scenarioId: "not-a-uuid",
		};

		// Act
		const parsed = RecordAttemptInputSchema.safeParse(invalid);

		// Assert
		expect(parsed.success).toBe(false);
	});
});
