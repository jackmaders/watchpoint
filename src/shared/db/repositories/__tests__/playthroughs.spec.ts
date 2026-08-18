import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "../../client/client";
import {
	completePlaythrough,
	createPlaythrough,
	getPlayerHistory,
	getPlaythrough,
} from "../playthroughs";

vi.mock("../../client/client");

describe("playthrough database accessors", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("creates a Session Playthrough with selected modules and immutable Scenario snapshots", async () => {
		// Arrange
		const db = await getDb();

		// Act
		const result = await createPlaythrough({
			modules: ["STRATEGY", "TACTICS"],
			scenarios: [
				{
					explanationText: "Hold the high ground.",
					inputConfig: { options: [] },
					inputType: "MULTIPLE_CHOICE",
					moduleType: "STRATEGY",
					promptText: "Where should you position?",
					scenarioId: "scenario_1",
					timestampSeconds: 120,
				},
			],
			userId: "player_1",
			vodId: "vod_1",
		});

		// Assert
		expect(result.id).toBe("mock_attempt_id");
		expect(db.insert).toHaveBeenCalledTimes(3);
	});

	it("loads a playthrough with its selections, snapshots, and attempts", async () => {
		// Arrange
		const db = await getDb();
		const expected = {
			attempts: [],
			id: "playthrough_1",
			moduleSelections: [{ moduleType: "STRATEGY" }],
			scenarioSnapshots: [{ position: 0, scenarioId: "scenario_1" }],
		};
		vi.mocked(db.query.playthroughs.findFirst).mockResolvedValueOnce(
			expected as never,
		);

		// Act
		const result = await getPlaythrough("playthrough_1", "player_1");

		// Assert
		expect(result).toEqual(expected);
		expect(db.query.playthroughs.findFirst).toHaveBeenCalled();
	});

	it("creates an empty playthrough without optional child rows", async () => {
		// Arrange
		const db = await getDb();

		// Act
		const result = await createPlaythrough({
			modules: [],
			scenarios: [],
			userId: "player_1",
			vodId: "vod_1",
		});

		// Assert
		expect(result.id).toBe("mock_attempt_id");
		expect(db.insert).toHaveBeenCalledTimes(1);
	});

	it("accepts a stable playthrough identifier when provided", async () => {
		// Arrange
		const db = await getDb();

		// Act
		const result = await createPlaythrough({
			id: "stable_playthrough_1",
			modules: [],
			scenarios: [],
			userId: "player_1",
			vodId: "vod_1",
		});

		// Assert
		expect(result.id).toBe("mock_attempt_id");
		expect(db.insert).toHaveBeenCalledTimes(1);
	});

	it("throws when a playthrough cannot be returned after insertion", async () => {
		// Arrange
		const db = await getDb();
		vi.mocked(db.insert).mockReturnValueOnce({
			values: vi.fn(() => ({
				returning: vi.fn().mockResolvedValueOnce([]),
			})),
		} as never);

		// Act & Assert
		await expect(
			createPlaythrough({
				modules: [],
				scenarios: [],
				userId: "player_1",
				vodId: "vod_1",
			}),
		).rejects.toThrow("Failed to create playthrough");
	});

	it("loads a playthrough without an ownership filter", async () => {
		// Arrange
		const db = await getDb();
		const expected = { attempts: [], id: "playthrough_1" };
		vi.mocked(db.query.playthroughs.findFirst).mockResolvedValueOnce(
			expected as never,
		);

		// Act
		const result = await getPlaythrough("playthrough_1");

		// Assert
		expect(result).toEqual(expected);
	});

	it("returns only non-test accounts from player history", async () => {
		// Arrange
		const db = await getDb();
		vi.mocked(db.query.playthroughs.findMany).mockResolvedValueOnce([
			{ id: "real_run", user: { isTestAccount: false } },
			{ id: "fixture_run", user: { isTestAccount: true } },
		] as never);

		// Act
		const result = await getPlayerHistory("player_1");

		// Assert
		expect(result).toEqual([
			{ id: "real_run", user: { isTestAccount: false } },
		]);
	});

	it("marks an owned playthrough complete", async () => {
		// Arrange
		const db = await getDb();
		vi.mocked(db.update).mockReturnValueOnce({
			set: vi.fn(() => ({
				where: vi.fn(() => ({
					returning: vi
						.fn()
						.mockResolvedValueOnce([
							{ id: "playthrough_1", status: "COMPLETED" },
						]),
				})),
			})),
		} as never);

		// Act
		const result = await completePlaythrough("playthrough_1", "player_1");

		// Assert
		expect(result).toEqual({ id: "playthrough_1", status: "COMPLETED" });
	});

	it("returns null when completion updates no playthrough", async () => {
		// Arrange
		const db = await getDb();
		vi.mocked(db.update).mockReturnValueOnce({
			set: vi.fn(() => ({
				where: vi.fn(() => ({
					returning: vi.fn().mockResolvedValueOnce([]),
				})),
			})),
		} as never);

		// Act
		const result = await completePlaythrough("missing", "player_1");

		// Assert
		expect(result).toBeNull();
	});
});
