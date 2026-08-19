import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "../../client/client";
import {
	getAttemptByIdempotencyKey,
	getPlaythroughAttempts,
	recordPlaythroughAttempt,
} from "../attempts";

vi.mock("../../client/client");

describe("playthrough attempt accessors", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("records an Attempt Record for an authenticated playthrough", async () => {
		// Arrange
		const db = await getDb();
		vi.mocked(db.insert).mockReturnValueOnce({
			values: vi.fn(() => ({
				returning: vi
					.fn()
					.mockResolvedValueOnce([
						{ id: "attempt_1", playthroughId: "playthrough_1" },
					]),
			})),
		} as never);

		// Act
		const result = await recordPlaythroughAttempt({
			idempotencyKey: "attempt-key-1",
			isCorrect: true,
			playthroughId: "playthrough_1",
			responseTimeMs: 850,
			scenarioId: "scenario_1",
			scenarioSnapshotId: "snapshot_1",
			userId: "player_1",
		});

		// Assert
		expect(result).toEqual({ id: "attempt_1", playthroughId: "playthrough_1" });
	});

	it("returns null when the database does not return a new Attempt Record", async () => {
		// Arrange
		const db = await getDb();
		vi.mocked(db.insert).mockReturnValueOnce({
			values: vi.fn(() => ({
				returning: vi.fn().mockResolvedValueOnce([]),
			})),
		} as never);

		// Act
		const result = await recordPlaythroughAttempt({
			idempotencyKey: "attempt-key-2",
			isCorrect: false,
			playthroughId: "playthrough_1",
			responseTimeMs: 0,
			scenarioId: "scenario_1",
			scenarioSnapshotId: "snapshot_1",
			userId: "player_1",
		});

		// Assert
		expect(result).toBeNull();
	});

	it("returns the existing Attempt Record for an identical idempotent retry", async () => {
		// Arrange
		const db = await getDb();
		vi.mocked(db.insert).mockReturnValueOnce({
			values: vi.fn(() => ({
				returning: vi
					.fn()
					.mockRejectedValueOnce(
						new Error(
							"UNIQUE constraint failed: attempt_record.idempotency_key",
						),
					),
			})),
		} as never);
		vi.mocked(db.query.attemptRecords.findFirst).mockResolvedValueOnce({
			createdAt: new Date("2026-08-18T12:00:00Z"),
			id: "attempt_1",
			idempotencyKey: "attempt-key-3",
			inputValue: { answer: ["correct", { confidence: 1 }] },
			isCorrect: true,
			isTimedOut: false,
			playthroughId: "playthrough_1",
			responseTimeMs: 850,
			scenarioId: "scenario_1",
			scenarioSnapshotId: "snapshot_1",
			selectedOptionId: "correct",
			userId: "player_1",
		} as never);

		// Act
		const result = await recordPlaythroughAttempt({
			idempotencyKey: "attempt-key-3",
			inputValue: { answer: ["correct", { confidence: 1 }] },
			isCorrect: true,
			playthroughId: "playthrough_1",
			responseTimeMs: 850,
			scenarioId: "scenario_1",
			scenarioSnapshotId: "snapshot_1",
			selectedOptionId: "correct",
			userId: "player_1",
		});

		// Assert
		expect(result).toMatchObject({ id: "attempt_1" });
	});

	it("rejects an idempotency key reused for a different Attempt Record", async () => {
		// Arrange
		const db = await getDb();
		vi.mocked(db.insert).mockReturnValueOnce({
			values: vi.fn(() => ({
				returning: vi
					.fn()
					.mockRejectedValueOnce(
						new Error(
							"UNIQUE constraint failed: attempt_record.idempotency_key",
						),
					),
			})),
		} as never);
		vi.mocked(db.query.attemptRecords.findFirst).mockResolvedValueOnce({
			id: "attempt_1",
			idempotencyKey: "attempt-key-4",
			inputValue: { answer: ["correct"] },
			isCorrect: true,
			isTimedOut: false,
			playthroughId: "playthrough_1",
			responseTimeMs: 850,
			scenarioId: "scenario_1",
			scenarioSnapshotId: "snapshot_1",
			selectedOptionId: "correct",
			userId: "player_1",
		} as never);

		// Act & Assert
		await expect(
			recordPlaythroughAttempt({
				idempotencyKey: "attempt-key-4",
				inputValue: { answer: "different" },
				isCorrect: true,
				playthroughId: "playthrough_1",
				responseTimeMs: 850,
				scenarioId: "scenario_1",
				scenarioSnapshotId: "snapshot_1",
				selectedOptionId: "correct",
				userId: "player_1",
			}),
		).rejects.toThrow("Attempt idempotency conflict");
	});

	it("rejects a database error that is not an idempotency conflict", async () => {
		// Arrange
		const db = await getDb();
		vi.mocked(db.insert).mockReturnValueOnce({
			values: vi.fn(() => ({
				returning: vi.fn().mockRejectedValueOnce(new Error("database offline")),
			})),
		} as never);

		// Act & Assert
		await expect(
			recordPlaythroughAttempt({
				idempotencyKey: "attempt-key-5",
				isCorrect: true,
				playthroughId: "playthrough_1",
				responseTimeMs: 850,
				scenarioId: "scenario_1",
				scenarioSnapshotId: "snapshot_1",
				userId: "player_1",
			}),
		).rejects.toThrow("database offline");
	});

	it("rejects a retry when the original payload had input data", async () => {
		// Arrange
		const db = await getDb();
		vi.mocked(db.insert).mockReturnValueOnce({
			values: vi.fn(() => ({
				returning: vi
					.fn()
					.mockRejectedValueOnce(
						new Error(
							"UNIQUE constraint failed: attempt_record.idempotency_key",
						),
					),
			})),
		} as never);
		vi.mocked(db.query.attemptRecords.findFirst).mockResolvedValueOnce({
			id: "attempt_1",
			idempotencyKey: "attempt-key-6",
			inputValue: { answer: "correct" },
			isCorrect: true,
			isTimedOut: false,
			playthroughId: "playthrough_1",
			responseTimeMs: 850,
			scenarioId: "scenario_1",
			scenarioSnapshotId: "snapshot_1",
			selectedOptionId: "correct",
			userId: "player_1",
		} as never);

		// Act & Assert
		await expect(
			recordPlaythroughAttempt({
				idempotencyKey: "attempt-key-6",
				isCorrect: true,
				playthroughId: "playthrough_1",
				responseTimeMs: 850,
				scenarioId: "scenario_1",
				scenarioSnapshotId: "snapshot_1",
				selectedOptionId: "correct",
				userId: "player_1",
			}),
		).rejects.toThrow("Attempt idempotency conflict");
	});

	it("loads attempts only for the requested owned playthrough", async () => {
		// Arrange
		const db = await getDb();
		const expected = [{ id: "attempt_1", playthroughId: "playthrough_1" }];
		vi.mocked(db.query.attemptRecords.findMany).mockResolvedValueOnce(
			expected as never,
		);

		// Act
		const result = await getPlaythroughAttempts("playthrough_1", "player_1");

		// Assert
		expect(result).toEqual(expected);
	});

	it("returns no attempts when another user requests the playthrough", async () => {
		// Arrange
		const db = await getDb();
		vi.mocked(db.query.attemptRecords.findMany).mockResolvedValueOnce([]);

		// Act
		const result = await getPlaythroughAttempts("owner_1", "other_user");

		// Assert
		expect(result).toEqual([]);
	});

	it("finds an owned attempt by idempotency key", async () => {
		// Arrange
		const db = await getDb();
		const expected = { id: "attempt_1", idempotencyKey: "attempt-key-1" };
		vi.mocked(db.query.attemptRecords.findFirst).mockResolvedValueOnce(
			expected as never,
		);

		// Act
		const result = await getAttemptByIdempotencyKey(
			"attempt-key-1",
			"player_1",
		);

		// Assert
		expect(result).toEqual(expected);
	});

	it("does not disclose an attempt idempotency key across users", async () => {
		// Arrange
		const db = await getDb();
		vi.mocked(db.query.attemptRecords.findFirst).mockResolvedValueOnce(
			undefined,
		);

		// Act
		const result = await getAttemptByIdempotencyKey(
			"attempt-key-1",
			"other_user",
		);

		// Assert
		expect(result).toBeUndefined();
	});
});
