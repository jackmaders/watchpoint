import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	createAttemptRecord,
	createDbClient,
	getPlaythroughById,
	queryScenarioSnapshots,
} from "@/shared/db";
import { getCurrentUser } from "@/shared/lib/auth";
import { recordAttemptAction } from "../record-attempt";

vi.mock("@/shared/db");
vi.mock("@/shared/lib/auth");

describe("recordAttemptAction", () => {
	const validIdempotencyKey = "7b3b7f7e-4f3c-4f84-8a0d-5e3a4f7f2c91";
	const validScenarioId = "f47ac10b-58cc-4372-a567-0e02b2c3d479";

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(createDbClient).mockReturnValue({} as never);
		vi.mocked(getCurrentUser).mockResolvedValue({ id: "usr_auth_default" });
		vi.mocked(createAttemptRecord).mockResolvedValue({
			id: "mock_attempt_id",
		} as never);
		vi.mocked(getPlaythroughById).mockResolvedValue({
			id: "playthrough_1",
			status: "IN_PROGRESS",
			userId: "usr_auth_default",
			vodId: "vod_1",
		} as never);
		vi.mocked(queryScenarioSnapshots).mockResolvedValue([
			{ id: "snapshot_1", scenarioId: validScenarioId },
		] as never);
	});

	it("rejects an attempt for an unauthenticated user", async () => {
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
			error: "Authentication required",
			success: false,
		});
		expect(createAttemptRecord).not.toHaveBeenCalled();
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
		expect(createAttemptRecord).toHaveBeenCalledWith(
			expect.objectContaining({
				idempotencyKey: validIdempotencyKey,
				isCorrect: true,
				responseTimeMs: 800,
				scenarioId: validScenarioId,
				selectedOptionId: "opt_b",
				userId: "usr_auth_456",
			}),
			expect.anything(),
		);
	});

	it("returns a safe failure envelope for invalid UUID scenarioId", async () => {
		// Arrange
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
		expect(createAttemptRecord).not.toHaveBeenCalled();
	});

	it("returns a safe failure envelope for negative responseTimeMs", async () => {
		// Arrange
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
		expect(createAttemptRecord).not.toHaveBeenCalled();
	});

	it("returns a safe failure envelope for float responseTimeMs", async () => {
		// Arrange
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
		expect(createAttemptRecord).not.toHaveBeenCalled();
	});

	it("returns a safe failure envelope when payload is completely invalid", async () => {
		// Arrange
		const input = {};

		// Act
		const result = await recordAttemptAction(input as never);

		// Assert
		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
		expect(createAttemptRecord).not.toHaveBeenCalled();
	});

	it("returns a safe failure envelope when createAttemptRecord throws an unexpected error", async () => {
		// Arrange
		vi.mocked(createAttemptRecord).mockRejectedValueOnce(
			new Error("D1 connection lost"),
		);
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
			error: "D1 connection lost",
			success: false,
		});
	});

	it("requires a UUID idempotency key for new writes", async () => {
		// Arrange
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
		expect(createAttemptRecord).not.toHaveBeenCalled();
	});

	it("rejects a non-UUID idempotency key without inserting", async () => {
		// Arrange
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
		expect(createAttemptRecord).not.toHaveBeenCalled();
	});

	it("persists the idempotency key and answer fields", async () => {
		// Arrange
		vi.mocked(createAttemptRecord).mockResolvedValueOnce({
			id: "attempt_1",
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
		expect(result).toEqual({ attemptId: "attempt_1", success: true });
		expect(createAttemptRecord).toHaveBeenCalledWith(
			{
				idempotencyKey: validIdempotencyKey,
				inputValue: null,
				isCorrect: true,
				isTimedOut: false,
				playthroughId: undefined as never,
				responseTimeMs: 1500,
				scenarioId: validScenarioId,
				scenarioSnapshotId: undefined as never,
				selectedOptionId: "opt_a",
				userId: "usr_auth_default",
			},
			expect.anything(),
		);
	});

	it("persists playthrough and Scenario snapshot ownership when supplied", async () => {
		// Arrange
		vi.mocked(getPlaythroughById).mockResolvedValueOnce({
			id: "playthrough_1",
			status: "IN_PROGRESS",
			userId: "usr_auth_default",
			vodId: "vod_1",
		} as never);
		vi.mocked(queryScenarioSnapshots).mockResolvedValueOnce([
			{ id: "snapshot_1", scenarioId: validScenarioId },
		] as never);
		vi.mocked(createAttemptRecord).mockResolvedValueOnce({
			id: "attempt_2",
		} as never);
		const input = {
			idempotencyKey: validIdempotencyKey,
			isCorrect: true,
			playthroughId: "playthrough_1",
			responseTimeMs: 1500,
			scenarioId: validScenarioId,
			scenarioSnapshotId: "snapshot_1",
			selectedOptionId: "opt_a",
		};

		// Act
		const result = await recordAttemptAction(input);

		// Assert
		expect(result).toEqual({ attemptId: "attempt_2", success: true });
		expect(createAttemptRecord).toHaveBeenCalledWith(
			expect.objectContaining({
				playthroughId: "playthrough_1",
				scenarioSnapshotId: "snapshot_1",
			}),
			expect.anything(),
		);
	});

	it("rejects playthrough identifiers that are not owned by the user", async () => {
		// Arrange
		vi.mocked(getPlaythroughById).mockResolvedValueOnce(undefined as never);
		const input = {
			idempotencyKey: validIdempotencyKey,
			isCorrect: true,
			playthroughId: "other_playthrough",
			responseTimeMs: 1500,
			scenarioId: validScenarioId,
			scenarioSnapshotId: "other_snapshot",
		};

		// Act
		const result = await recordAttemptAction(input);

		// Assert
		expect(result).toEqual({
			error: "Playthrough snapshot ownership is required",
			success: false,
		});
		expect(createAttemptRecord).not.toHaveBeenCalled();
	});

	it("rejects attempts after the playthrough is completed", async () => {
		// Arrange
		vi.mocked(getPlaythroughById).mockResolvedValueOnce({
			id: "playthrough_1",
			status: "COMPLETED",
			userId: "usr_auth_default",
			vodId: "vod_1",
		} as never);
		const input = {
			idempotencyKey: validIdempotencyKey,
			isCorrect: true,
			playthroughId: "playthrough_1",
			responseTimeMs: 1500,
			scenarioId: validScenarioId,
			scenarioSnapshotId: "snapshot_1",
			selectedOptionId: "opt_a",
		};

		// Act
		const result = await recordAttemptAction(input);

		// Assert
		expect(result).toEqual({
			error: "Playthrough snapshot ownership is required",
			success: false,
		});
		expect(createAttemptRecord).not.toHaveBeenCalled();
	});

	it("rejects a snapshot whose source Scenario does not match", async () => {
		// Arrange
		vi.mocked(getPlaythroughById).mockResolvedValueOnce({
			id: "playthrough_1",
			status: "IN_PROGRESS",
			userId: "usr_auth_default",
			vodId: "vod_1",
		} as never);
		vi.mocked(queryScenarioSnapshots).mockResolvedValueOnce([
			{ id: "snapshot_1", scenarioId: "other_scenario" },
		] as never);
		const input = {
			idempotencyKey: validIdempotencyKey,
			isCorrect: true,
			playthroughId: "playthrough_1",
			responseTimeMs: 1500,
			scenarioId: validScenarioId,
			scenarioSnapshotId: "snapshot_1",
			selectedOptionId: "opt_a",
		};

		// Act
		const result = await recordAttemptAction(input);

		// Assert
		expect(result).toEqual({
			error: "Playthrough snapshot ownership is required",
			success: false,
		});
		expect(createAttemptRecord).not.toHaveBeenCalled();
	});

	it("rejects an attempt with only one persistence identifier", async () => {
		// Arrange
		const input = {
			idempotencyKey: validIdempotencyKey,
			isCorrect: true,
			playthroughId: "playthrough_1",
			responseTimeMs: 1500,
			scenarioId: validScenarioId,
		};

		// Act
		const result = await recordAttemptAction(input);

		// Assert
		expect(result).toEqual({
			error: "Playthrough snapshot ownership is required",
			success: false,
		});
		expect(createAttemptRecord).not.toHaveBeenCalled();
	});

	it("persists timeout state independently from correctness", async () => {
		// Arrange
		vi.mocked(createAttemptRecord).mockResolvedValueOnce({
			id: "attempt_timeout",
		} as never);
		const input = {
			idempotencyKey: validIdempotencyKey,
			isCorrect: false,
			isTimedOut: true,
			responseTimeMs: 3000,
			scenarioId: validScenarioId,
			selectedOptionId: null,
		};

		// Act
		const result = await recordAttemptAction(input);

		// Assert
		expect(result).toEqual({ attemptId: "attempt_timeout", success: true });
		expect(createAttemptRecord).toHaveBeenCalledWith(
			{
				idempotencyKey: validIdempotencyKey,
				inputValue: null,
				isCorrect: false,
				isTimedOut: true,
				playthroughId: undefined as never,
				responseTimeMs: 3000,
				scenarioId: validScenarioId,
				scenarioSnapshotId: undefined as never,
				selectedOptionId: null,
				userId: "usr_auth_default",
			},
			expect.anything(),
		);
	});

	it("handles non-Error thrown exceptions safely", async () => {
		// Arrange
		vi.mocked(createAttemptRecord).mockRejectedValueOnce(
			"Unknown fatal failure",
		);
		const input = {
			idempotencyKey: validIdempotencyKey,
			isCorrect: true,
			isTimedOut: false,
			responseTimeMs: 1000,
			scenarioId: validScenarioId,
			selectedOptionId: "opt_1",
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
