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
});
