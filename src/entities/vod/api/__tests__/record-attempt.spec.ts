import { beforeEach, describe, expect, it, vi } from "vitest";
import { playthroughService } from "@/shared/db";
import { getCurrentUser } from "@/shared/lib/auth";
import { recordAttemptAction } from "../record-attempt";

vi.mock("@/shared/db");
vi.mock("@/shared/lib/auth");

describe("recordAttemptAction", () => {
	const validIdempotencyKey = "7b3b7f7e-4f3c-4f84-8a0d-5e3a4f7f2c91";
	const validScenarioId = "f47ac10b-58cc-4372-a567-0e02b2c3d479";

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getCurrentUser).mockResolvedValue({ id: "usr_auth_default" });
		vi.mocked(playthroughService.recordAttempt).mockResolvedValue({
			data: { id: "mock_attempt_id" } as never,
			success: true,
		});
		vi.mocked(playthroughService.getById).mockResolvedValue({
			data: {
				attempts: [],
				id: "playthrough_1",
				moduleSelections: [],
				scenarioSnapshots: [{ id: "snapshot_1", scenarioId: validScenarioId }],
				status: "IN_PROGRESS",
				userId: "usr_auth_default",
				vodId: "vod_1",
			} as never,
			success: true,
		});
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
		expect(playthroughService.recordAttempt).not.toHaveBeenCalled();
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
		expect(playthroughService.recordAttempt).toHaveBeenCalledWith(
			expect.objectContaining({
				idempotencyKey: validIdempotencyKey,
				isCorrect: true,
				responseTimeMs: 800,
				scenarioId: validScenarioId,
				selectedOptionId: "opt_b",
				userId: "usr_auth_456",
			}),
			undefined,
		);
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
			error: "Authentication required",
			success: false,
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
			error: "Authentication required",
			success: false,
		});
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
		expect(playthroughService.recordAttempt).not.toHaveBeenCalled();
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
		expect(playthroughService.recordAttempt).not.toHaveBeenCalled();
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
		expect(playthroughService.recordAttempt).not.toHaveBeenCalled();
	});

	it("returns a safe failure envelope when payload is completely invalid", async () => {
		// Arrange
		const input = {};

		// Act
		const result = await recordAttemptAction(input as never);

		// Assert
		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
		expect(playthroughService.recordAttempt).not.toHaveBeenCalled();
	});

	it("returns a safe failure envelope when playthroughService.recordAttempt returns an error", async () => {
		// Arrange
		vi.mocked(playthroughService.recordAttempt).mockResolvedValueOnce({
			error: "Failed to record attempt",
			success: false,
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

	it("returns a safe failure envelope when recordAttempt throws an unexpected error", async () => {
		// Arrange
		vi.mocked(playthroughService.recordAttempt).mockRejectedValueOnce(
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
			error: "Failed to record attempt",
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
		expect(playthroughService.recordAttempt).not.toHaveBeenCalled();
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
		expect(playthroughService.recordAttempt).not.toHaveBeenCalled();
	});

	it("persists the idempotency key and answer fields", async () => {
		// Arrange
		vi.mocked(playthroughService.recordAttempt).mockResolvedValueOnce({
			data: { id: "attempt_1" } as never,
			success: true,
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
		expect(result).toEqual({ attemptId: "attempt_1", success: true });
		expect(playthroughService.recordAttempt).toHaveBeenCalledWith(
			{
				idempotencyKey: validIdempotencyKey,
				inputValue: undefined,
				isCorrect: true,
				isTimedOut: false,
				playthroughId: undefined as never,
				responseTimeMs: 1500,
				scenarioId: validScenarioId,
				scenarioSnapshotId: undefined as never,
				selectedOptionId: "opt_a",
				userId: "usr_auth_default",
			},
			undefined,
		);
	});

	it("persists playthrough and Scenario snapshot ownership when supplied", async () => {
		// Arrange
		vi.mocked(playthroughService.getById).mockResolvedValueOnce({
			data: {
				attempts: [],
				id: "playthrough_1",
				moduleSelections: [],
				scenarioSnapshots: [{ id: "snapshot_1", scenarioId: validScenarioId }],
				status: "IN_PROGRESS",
				userId: "usr_auth_default",
				vodId: "vod_1",
			} as never,
			success: true,
		});
		vi.mocked(playthroughService.recordAttempt).mockResolvedValueOnce({
			data: { id: "attempt_2" } as never,
			success: true,
		});
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
		expect(playthroughService.recordAttempt).toHaveBeenCalledWith(
			expect.objectContaining({
				playthroughId: "playthrough_1",
				scenarioSnapshotId: "snapshot_1",
			}),
			undefined,
		);
	});

	it("rejects playthrough identifiers that are not owned by the user", async () => {
		// Arrange
		vi.mocked(playthroughService.getById).mockResolvedValueOnce({
			data: null,
			success: true,
		});
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
		expect(playthroughService.recordAttempt).not.toHaveBeenCalled();
	});

	it("rejects attempts after the playthrough is completed", async () => {
		// Arrange
		vi.mocked(playthroughService.getById).mockResolvedValueOnce({
			data: {
				attempts: [],
				id: "playthrough_1",
				moduleSelections: [],
				scenarioSnapshots: [{ id: "snapshot_1", scenarioId: validScenarioId }],
				status: "COMPLETED",
				userId: "usr_auth_default",
				vodId: "vod_1",
			} as never,
			success: true,
		});
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
		expect(playthroughService.recordAttempt).not.toHaveBeenCalled();
	});

	it("rejects a snapshot whose source Scenario does not match", async () => {
		// Arrange
		vi.mocked(playthroughService.getById).mockResolvedValueOnce({
			data: {
				attempts: [],
				id: "playthrough_1",
				moduleSelections: [],
				scenarioSnapshots: [{ id: "snapshot_1", scenarioId: "other_scenario" }],
				status: "IN_PROGRESS",
				userId: "usr_auth_default",
				vodId: "vod_1",
			} as never,
			success: true,
		});
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
		expect(playthroughService.recordAttempt).not.toHaveBeenCalled();
	});

	it("rejects an owned playthrough without the requested snapshot", async () => {
		// Arrange
		vi.mocked(playthroughService.getById).mockResolvedValueOnce({
			data: {
				attempts: [],
				id: "playthrough_1",
				moduleSelections: [],
				scenarioSnapshots: [],
				status: "IN_PROGRESS",
				userId: "usr_auth_default",
				vodId: "vod_1",
			} as never,
			success: true,
		});
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
		expect(playthroughService.recordAttempt).not.toHaveBeenCalled();
	});

	it("rejects an owned playthrough with a different snapshot", async () => {
		// Arrange
		vi.mocked(playthroughService.getById).mockResolvedValueOnce({
			data: {
				attempts: [],
				id: "playthrough_1",
				moduleSelections: [],
				scenarioSnapshots: [
					{ id: "other_snapshot", scenarioId: validScenarioId },
				],
				status: "IN_PROGRESS",
				userId: "usr_auth_default",
				vodId: "vod_1",
			} as never,
			success: true,
		});
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
		expect(playthroughService.recordAttempt).not.toHaveBeenCalled();
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
		expect(playthroughService.recordAttempt).not.toHaveBeenCalled();
	});

	it("returns idempotency conflict when service returns idempotency conflict", async () => {
		// Arrange
		vi.mocked(playthroughService.recordAttempt).mockResolvedValueOnce({
			error: "Attempt idempotency conflict",
			success: false,
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
			error: "Attempt idempotency conflict",
			success: false,
		});
	});

	it("persists timeout state independently from correctness", async () => {
		// Arrange
		vi.mocked(playthroughService.recordAttempt).mockResolvedValueOnce({
			data: { id: "attempt_timeout" } as never,
			success: true,
		});
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
		expect(playthroughService.recordAttempt).toHaveBeenCalledWith(
			{
				idempotencyKey: validIdempotencyKey,
				inputValue: undefined,
				isCorrect: false,
				isTimedOut: true,
				playthroughId: undefined as never,
				responseTimeMs: 3000,
				scenarioId: validScenarioId,
				scenarioSnapshotId: undefined as never,
				selectedOptionId: null,
				userId: "usr_auth_default",
			},
			undefined,
		);
	});
});
