import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/shared/db";
import { getCurrentUser } from "@/shared/lib/auth";
import { recordAttemptAction } from "../record-attempt";

vi.mock("@/shared/db/client/client");
vi.mock("@/shared/lib/auth");

describe("recordAttemptAction", () => {
	const validScenarioId = "f47ac10b-58cc-4372-a567-0e02b2c3d479";

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("successfully records an attempt for unauthenticated guest user", async () => {
		// Arrange
		vi.mocked(getCurrentUser).mockResolvedValueOnce(null);
		const input = {
			inputValue: { choice: "opt_a" },
			isCorrect: true,
			responseTimeMs: 1450,
			scenarioId: validScenarioId,
			selectedOptionId: "opt_a",
		};

		// Act
		const result = await recordAttemptAction(input);

		// Assert
		expect(result).toEqual({
			attemptId: "mock_attempt_id",
			success: true,
		});
	});

	it("attributes attempt to authenticated user when user session is available", async () => {
		// Arrange
		vi.mocked(getCurrentUser).mockResolvedValueOnce({ id: "usr_auth_456" });
		const input = {
			isCorrect: true,
			responseTimeMs: 800,
			scenarioId: validScenarioId,
			selectedOptionId: "opt_b",
		};

		// Act
		const result = await recordAttemptAction(input);

		// Assert
		expect(result).toEqual({
			attemptId: "mock_attempt_id",
			success: true,
		});
	});

	it("handles timeout response with omitted selectedOptionId and zero latency", async () => {
		// Arrange
		vi.mocked(getCurrentUser).mockResolvedValueOnce(null);
		const input = {
			isCorrect: false,
			responseTimeMs: 0,
			scenarioId: validScenarioId,
		};

		// Act
		const result = await recordAttemptAction(input);

		// Assert
		expect(result).toEqual({
			attemptId: "mock_attempt_id",
			success: true,
		});
	});

	it("handles nullable selectedOptionId explicitly", async () => {
		// Arrange
		vi.mocked(getCurrentUser).mockResolvedValueOnce(null);
		const input = {
			isCorrect: false,
			responseTimeMs: 3000,
			scenarioId: validScenarioId,
			selectedOptionId: null,
		};

		// Act
		const result = await recordAttemptAction(input);

		// Assert
		expect(result).toEqual({
			attemptId: "mock_attempt_id",
			success: true,
		});
	});

	it("returns a safe failure envelope for invalid UUID scenarioId", async () => {
		// Arrange
		const db = await getDb();
		const input = {
			isCorrect: true,
			responseTimeMs: 1200,
			scenarioId: "invalid-uuid-string",
			selectedOptionId: "opt_a",
		};

		// Act
		const result = await recordAttemptAction(input as never);

		// Assert
		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
		expect(db.insert).not.toHaveBeenCalled();
	});

	it("returns a safe failure envelope for negative responseTimeMs", async () => {
		// Arrange
		const db = await getDb();
		const input = {
			isCorrect: true,
			responseTimeMs: -100,
			scenarioId: validScenarioId,
			selectedOptionId: "opt_a",
		};

		// Act
		const result = await recordAttemptAction(input as never);

		// Assert
		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
		expect(db.insert).not.toHaveBeenCalled();
	});

	it("returns a safe failure envelope for float responseTimeMs", async () => {
		// Arrange
		const db = await getDb();
		const input = {
			isCorrect: true,
			responseTimeMs: 1234.56,
			scenarioId: validScenarioId,
			selectedOptionId: "opt_a",
		};

		// Act
		const result = await recordAttemptAction(input as never);

		// Assert
		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
		expect(db.insert).not.toHaveBeenCalled();
	});

	it("returns a safe failure envelope when payload is completely invalid", async () => {
		// Arrange
		const db = await getDb();
		const input = {};

		// Act
		const result = await recordAttemptAction(input as never);

		// Assert
		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
		expect(db.insert).not.toHaveBeenCalled();
	});

	it("returns a safe failure envelope when database insertion throws an unexpected error", async () => {
		// Arrange
		const db = await getDb();
		vi.mocked(db.insert).mockImplementationOnce(() => {
			throw new Error("D1 connection lost");
		});
		const input = {
			isCorrect: true,
			responseTimeMs: 1500,
			scenarioId: validScenarioId,
			selectedOptionId: "opt_a",
		};

		// Act
		const result = await recordAttemptAction(input);

		// Assert
		expect(result).toEqual({
			error: "Failed to record attempt",
			success: false,
		});
	});
});
