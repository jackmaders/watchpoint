import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/shared/db";
import { getCurrentUser } from "@/shared/lib/auth";
import { recordAttemptAction } from "../record-attempt";

vi.mock("@/shared/db/client/client");
vi.mock("@/shared/lib/auth");

describe("recordAttemptAction", () => {
	const validIdempotencyKey = "7b3b7f7e-4f3c-4f84-8a0d-5e3a4f7f2c91";
	const validScenarioId = "f47ac10b-58cc-4372-a567-0e02b2c3d479";

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("successfully records an attempt for unauthenticated guest user", async () => {
		// Arrange
		vi.mocked(getCurrentUser).mockResolvedValueOnce(null);
		const input = {
			idempotencyKey: validIdempotencyKey,
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
			idempotencyKey: validIdempotencyKey,
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
			idempotencyKey: validIdempotencyKey,
			isCorrect: false,
			responseTimeMs: 0,
			scenarioId: validScenarioId,
		};

		// Act
		const result = await recordAttemptAction(input as never);

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
			idempotencyKey: validIdempotencyKey,
			isCorrect: false,
			responseTimeMs: 3000,
			scenarioId: validScenarioId,
			selectedOptionId: null,
		};

		// Act
		const result = await recordAttemptAction(input as never);

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
			idempotencyKey: validIdempotencyKey,
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

	it("does not classify unrelated uniqueness failures as idempotency conflicts", async () => {
		// Arrange
		const db = await getDb();
		vi.mocked(db.insert).mockImplementationOnce(() => {
			throw new Error("UNIQUE constraint failed: attempt_record.id");
		});
		const input = {
			idempotencyKey: validIdempotencyKey,
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
		expect(db.query.attemptRecords.findFirst).not.toHaveBeenCalled();
	});

	it("requires a UUID idempotency key for new writes", async () => {
		// Arrange
		const db = await getDb();
		const input = {
			isCorrect: true,
			responseTimeMs: 1500,
			scenarioId: validScenarioId,
			selectedOptionId: "opt_a",
		};

		// Act
		const result = await recordAttemptAction(input as never);

		// Assert
		expect(result).toEqual({
			error: "Invalid attempt payload",
			success: false,
		});
		expect(db.insert).not.toHaveBeenCalled();
	});

	it("rejects a non-UUID idempotency key without inserting", async () => {
		// Arrange
		const db = await getDb();
		const input = {
			idempotencyKey: "not-a-uuid",
			isCorrect: true,
			responseTimeMs: 1500,
			scenarioId: validScenarioId,
			selectedOptionId: "opt_a",
		};

		// Act
		const result = await recordAttemptAction(input as never);

		// Assert
		expect(result.success).toBe(false);
		expect(result.error).toBe("Invalid attempt payload");
		expect(db.insert).not.toHaveBeenCalled();
	});

	it("persists the idempotency key and answer fields", async () => {
		// Arrange
		const db = await getDb();
		const values = vi.fn((_record: unknown) => ({
			returning: vi.fn().mockResolvedValue([{ id: "attempt_1" }]),
		}));
		vi.mocked(db.insert).mockImplementationOnce(() => ({ values }) as never);
		const input = {
			idempotencyKey: validIdempotencyKey,
			isCorrect: true,
			responseTimeMs: 1500,
			scenarioId: validScenarioId,
			selectedOptionId: "opt_a",
		};

		// Act
		const result = await recordAttemptAction(input);

		// Assert
		expect(result).toEqual({ attemptId: "attempt_1", success: true });
		expect(values).toHaveBeenCalledWith({
			idempotencyKey: validIdempotencyKey,
			inputValue: null,
			isCorrect: true,
			responseTimeMs: 1500,
			scenarioId: validScenarioId,
			selectedOptionId: "opt_a",
			userId: "usr_guest_demo",
		});
	});

	it("returns the canonical identifier for an identical duplicate", async () => {
		// Arrange
		const db = await getDb();
		vi.mocked(db.insert).mockImplementationOnce(() => {
			throw new Error(
				"UNIQUE constraint failed: attempt_record.idempotency_key",
			);
		});
		vi.mocked(db.query.attemptRecords.findFirst).mockResolvedValueOnce({
			id: "attempt_existing",
			idempotencyKey: validIdempotencyKey,
			inputValue: {
				answers: ["opt_a"],
				metadata: { source: "client" },
			},
			isCorrect: true,
			responseTimeMs: 1500,
			scenarioId: validScenarioId,
			selectedOptionId: "opt_a",
			userId: "usr_guest_demo",
		} as never);
		const input = {
			idempotencyKey: validIdempotencyKey,
			inputValue: {
				answers: ["opt_a"],
				metadata: { source: "client" },
			},
			isCorrect: true,
			responseTimeMs: 1500,
			scenarioId: validScenarioId,
			selectedOptionId: "opt_a",
		};

		// Act
		const result = await recordAttemptAction(input);

		// Assert
		expect(result).toEqual({
			attemptId: "attempt_existing",
			success: true,
		});
	});

	it("returns a generic conflict for changed-payload key reuse", async () => {
		// Arrange
		const db = await getDb();
		vi.mocked(db.insert).mockImplementationOnce(() => {
			throw new Error(
				"UNIQUE constraint failed: attempt_record.idempotency_key",
			);
		});
		vi.mocked(db.query.attemptRecords.findFirst).mockResolvedValueOnce({
			id: "attempt_existing",
			idempotencyKey: validIdempotencyKey,
			inputValue: {
				answers: ["opt_a"],
				metadata: { source: "client" },
			},
			isCorrect: true,
			responseTimeMs: 1500,
			scenarioId: validScenarioId,
			selectedOptionId: "opt_a",
			userId: "usr_guest_demo",
		} as never);
		const input = {
			idempotencyKey: validIdempotencyKey,
			inputValue: {
				answers: ["opt_a"],
				metadata: { source: "server" },
			},
			isCorrect: true,
			responseTimeMs: 1500,
			scenarioId: validScenarioId,
			selectedOptionId: "opt_a",
		};

		// Act
		const result = await recordAttemptAction(input);

		// Assert
		expect(result).toEqual({
			error: "Attempt idempotency conflict",
			success: false,
		});
	});

	it("returns a generic conflict for cross-actor key reuse", async () => {
		// Arrange
		const db = await getDb();
		vi.mocked(getCurrentUser).mockResolvedValueOnce({ id: "usr_other" });
		vi.mocked(db.insert).mockImplementationOnce(() => {
			throw new Error(
				"UNIQUE constraint failed: attempt_record.idempotency_key",
			);
		});
		vi.mocked(db.query.attemptRecords.findFirst).mockResolvedValueOnce({
			id: "attempt_existing",
			idempotencyKey: validIdempotencyKey,
			inputValue: null,
			isCorrect: true,
			responseTimeMs: 1500,
			scenarioId: validScenarioId,
			selectedOptionId: "opt_a",
			userId: "usr_guest_demo",
		} as never);
		const input = {
			idempotencyKey: validIdempotencyKey,
			isCorrect: true,
			responseTimeMs: 1500,
			scenarioId: validScenarioId,
			selectedOptionId: "opt_a",
		};

		// Act
		const result = await recordAttemptAction(input);

		// Assert
		expect(result).toEqual({
			error: "Attempt idempotency conflict",
			success: false,
		});
	});

	it("returns a generic conflict when duplicate input data is omitted", async () => {
		// Arrange
		const db = await getDb();
		vi.mocked(db.insert).mockImplementationOnce(() => {
			throw new Error(
				"UNIQUE constraint failed: attempt_record.idempotency_key",
			);
		});
		vi.mocked(db.query.attemptRecords.findFirst).mockResolvedValueOnce({
			id: "attempt_existing",
			idempotencyKey: validIdempotencyKey,
			inputValue: { choice: "opt_a" },
			isCorrect: true,
			responseTimeMs: 1500,
			scenarioId: validScenarioId,
			selectedOptionId: "opt_a",
			userId: "usr_guest_demo",
		} as never);
		const input = {
			idempotencyKey: validIdempotencyKey,
			isCorrect: true,
			responseTimeMs: 1500,
			scenarioId: validScenarioId,
			selectedOptionId: "opt_a",
		};

		// Act
		const result = await recordAttemptAction(input);

		// Assert
		expect(result).toEqual({
			error: "Attempt idempotency conflict",
			success: false,
		});
	});

	it("returns a generic conflict when duplicate JSON shapes differ", async () => {
		// Arrange
		const db = await getDb();
		vi.mocked(db.insert).mockImplementationOnce(() => {
			throw new Error(
				"UNIQUE constraint failed: attempt_record.idempotency_key",
			);
		});
		vi.mocked(db.query.attemptRecords.findFirst).mockResolvedValueOnce({
			id: "attempt_existing",
			idempotencyKey: validIdempotencyKey,
			inputValue: ["opt_a"],
			isCorrect: true,
			responseTimeMs: 1500,
			scenarioId: validScenarioId,
			selectedOptionId: "opt_a",
			userId: "usr_guest_demo",
		} as never);
		const input = {
			idempotencyKey: validIdempotencyKey,
			inputValue: { choice: "opt_a" },
			isCorrect: true,
			responseTimeMs: 1500,
			scenarioId: validScenarioId,
			selectedOptionId: "opt_a",
		};

		// Act
		const result = await recordAttemptAction(input);

		// Assert
		expect(result).toEqual({
			error: "Attempt idempotency conflict",
			success: false,
		});
	});

	it("maps timeout persistence through the existing correctness fields", async () => {
		// Arrange
		const db = await getDb();
		const values = vi.fn((_record: unknown) => ({
			returning: vi.fn().mockResolvedValue([{ id: "attempt_timeout" }]),
		}));
		vi.mocked(db.insert).mockImplementationOnce(() => ({ values }) as never);
		const input = {
			idempotencyKey: validIdempotencyKey,
			isCorrect: false,
			responseTimeMs: 3000,
			scenarioId: validScenarioId,
			selectedOptionId: null,
		};

		// Act
		const result = await recordAttemptAction(input);

		// Assert
		expect(result).toEqual({ attemptId: "attempt_timeout", success: true });
		expect(values).toHaveBeenCalledWith({
			idempotencyKey: validIdempotencyKey,
			inputValue: null,
			isCorrect: false,
			responseTimeMs: 3000,
			scenarioId: validScenarioId,
			selectedOptionId: null,
			userId: "usr_guest_demo",
		});
	});
});
