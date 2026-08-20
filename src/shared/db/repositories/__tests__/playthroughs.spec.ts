import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "../../client/client";
import {
	completePlaythrough,
	createPlaythrough,
	getPlayerHistory,
	getPlaythrough,
	getPlaythroughHistoryDetail,
	queryPlayerHistory,
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
		expect(db.insert).toHaveBeenCalledTimes(4);
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
		expect(db.insert).toHaveBeenCalledTimes(2);
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
		expect(db.insert).toHaveBeenCalledTimes(2);
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

	it("requires the authenticated owner when loading a playthrough", async () => {
		// Arrange
		const db = await getDb();
		const expected = { attempts: [], id: "playthrough_1" };
		vi.mocked(db.query.playthroughs.findFirst).mockResolvedValueOnce(
			expected as never,
		);

		// Act
		const result = await getPlaythrough("playthrough_1", "player_1");

		// Assert
		expect(result).toEqual(expected);
		expect(db.query.playthroughs.findFirst).toHaveBeenCalled();
	});

	it("does not disclose a playthrough when the authenticated owner does not match", async () => {
		// Arrange
		const db = await getDb();
		vi.mocked(db.query.playthroughs.findFirst).mockResolvedValueOnce(undefined);

		// Act
		const result = await getPlaythrough("owner_1", "other_user");

		// Assert
		expect(result).toBeUndefined();
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
		expect(result).toEqual({ id: "mock_attempt_id" });
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

	it("does not complete a playthrough owned by another user", async () => {
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
		const result = await completePlaythrough("owner_1", "other_user");

		// Assert
		expect(result).toBeNull();
	});

	it("returns an identical playthrough for a duplicate start identity", async () => {
		// Arrange
		const db = await getDb();
		vi.mocked(db.transaction).mockRejectedValueOnce(
			new Error("UNIQUE constraint failed: playthrough.id"),
		);
		vi.mocked(db.query.playthroughs.findFirst).mockResolvedValueOnce({
			id: "stable_playthrough_1",
			moduleSelections: [{ moduleType: "STRATEGY" }],
			scenarioSnapshots: [],
			userId: "player_1",
			vodId: "vod_1",
		} as never);

		// Act
		const result = await createPlaythrough({
			id: "stable_playthrough_1",
			modules: ["STRATEGY"],
			scenarios: [],
			userId: "player_1",
			vodId: "vod_1",
		});

		// Assert
		expect(result.id).toBe("stable_playthrough_1");
	});

	it("matches all snapshot content for a duplicate start identity", async () => {
		// Arrange
		const db = await getDb();
		vi.mocked(db.transaction).mockRejectedValueOnce(
			new Error("UNIQUE constraint failed: playthrough.id"),
		);
		vi.mocked(db.query.playthroughs.findFirst).mockResolvedValueOnce({
			id: "stable_playthrough_1",
			moduleSelections: [{ moduleType: "STRATEGY" }],
			scenarioSnapshots: [
				{
					explanationText: "Explain",
					imageUrl: null,
					inputConfig: { options: [] },
					inputType: "MULTIPLE_CHOICE",
					moduleType: "STRATEGY",
					position: 0,
					promptText: "Prompt",
					scenarioId: "scenario_1",
					timeLimitSeconds: null,
					timestampSeconds: 12,
				},
			],
			userId: "player_1",
			vodId: "vod_1",
		} as never);

		// Act
		const result = await createPlaythrough({
			id: "stable_playthrough_1",
			modules: ["STRATEGY"],
			scenarios: [
				{
					explanationText: "Explain",
					inputConfig: { options: [] },
					inputType: "MULTIPLE_CHOICE",
					moduleType: "STRATEGY",
					promptText: "Prompt",
					scenarioId: "scenario_1",
					timeLimitSeconds: null,
					timestampSeconds: 12,
				},
			],
			userId: "player_1",
			vodId: "vod_1",
		});

		// Assert
		expect(result.id).toBe("stable_playthrough_1");
	});

	it("preserves a caller supplied snapshot identity", async () => {
		// Arrange
		const db = await getDb();

		// Act
		await createPlaythrough({
			modules: [],
			scenarios: [
				{
					explanationText: "Explain",
					id: "snapshot_1",
					inputConfig: {},
					inputType: "MULTIPLE_CHOICE",
					moduleType: "STRATEGY",
					promptText: "Prompt",
					scenarioId: "scenario_1",
					timestampSeconds: 1,
				},
			],
			userId: "player_1",
			vodId: "vod_1",
		});

		// Assert
		expect(db.insert).toHaveBeenCalled();
	});

	it("rejects a duplicate start identity with changed content", async () => {
		// Arrange
		const db = await getDb();
		vi.mocked(db.transaction).mockRejectedValueOnce(
			new Error("UNIQUE constraint failed: playthrough.id"),
		);
		vi.mocked(db.query.playthroughs.findFirst).mockResolvedValueOnce({
			id: "stable_playthrough_1",
			moduleSelections: [],
			scenarioSnapshots: [],
			userId: "player_1",
			vodId: "other_vod",
		} as never);

		// Act & Assert
		await expect(
			createPlaythrough({
				id: "stable_playthrough_1",
				modules: [],
				scenarios: [],
				userId: "player_1",
				vodId: "vod_1",
			}),
		).rejects.toThrow("Playthrough start conflict");
	});

	it("returns the canonical completion after a concurrent completion", async () => {
		// Arrange
		const db = await getDb();
		vi.mocked(db.transaction).mockRejectedValueOnce(
			new Error(
				"UNIQUE constraint failed: playthrough_completion.playthrough_id",
			),
		);
		vi.mocked(db.query.playthroughCompletions.findFirst).mockResolvedValueOnce({
			id: "completion_1",
		} as never);

		// Act
		const result = await completePlaythrough("playthrough_1", "player_1");

		// Assert
		expect(result).toEqual({ id: "completion_1" });
	});

	it("returns null when completion creation returns no row", async () => {
		// Arrange
		const db = await getDb();
		vi.mocked(db.insert).mockImplementationOnce(
			() =>
				({
					values: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([]) })),
				}) as never,
		);

		// Act
		const result = await completePlaythrough("playthrough_1", "player_1");

		// Assert
		expect(result).toBeNull();
	});

	it("returns the existing completion for a sequential duplicate", async () => {
		// Arrange
		const db = await getDb();
		vi.mocked(db.update).mockReturnValueOnce({
			set: vi.fn(() => ({
				where: vi.fn(() => ({
					returning: vi.fn().mockResolvedValueOnce([]),
				})),
			})),
		} as never);
		vi.mocked(db.query.playthroughCompletions.findFirst).mockResolvedValueOnce({
			completedAt: new Date("2026-01-01T00:00:00.000Z"),
			id: "completion_1",
		} as never);

		// Act
		const result = await completePlaythrough("playthrough_1", "player_1");

		// Assert
		expect(result).toMatchObject({ id: "completion_1" });
	});

	it("rethrows non-unique completion failures", async () => {
		// Arrange
		const db = await getDb();
		vi.mocked(db.transaction).mockRejectedValueOnce(new Error("D1 offline"));

		// Act & Assert
		await expect(
			completePlaythrough("playthrough_1", "player_1"),
		).rejects.toThrow("D1 offline");
	});

	it("queries player history with filtering, pagination, and calculated metrics", async () => {
		// Arrange
		const db = await getDb();
		const mockPlaythroughs = [
			{
				attempts: [
					{
						id: "a1",
						isCorrect: true,
						isTimedOut: false,
						responseTimeMs: 1000,
					},
					{
						id: "a2",
						isCorrect: false,
						isTimedOut: false,
						responseTimeMs: 2000,
					},
				],
				completedAt: new Date("2026-01-01T12:00:00.000Z"),
				createdAt: new Date("2026-01-01T11:00:00.000Z"),
				id: "run_1",
				moduleSelections: [{ moduleType: "STRATEGY" }],
				scenarioSnapshots: [{ id: "s1" }, { id: "s2" }],
				status: "COMPLETED",
				user: { isTestAccount: false },
				userId: "player_1",
				vod: { id: "vod_1", mapName: "King's Row", title: "GM VOD" },
				vodId: "vod_1",
			},
			{
				attempts: [],
				completedAt: null,
				createdAt: new Date("2026-01-02T11:00:00.000Z"),
				id: "run_2",
				moduleSelections: [{ moduleType: "TACTICS" }],
				scenarioSnapshots: [{ id: "s3" }],
				status: "IN_PROGRESS",
				user: { isTestAccount: false },
				userId: "player_1",
				vod: { id: "vod_2", mapName: "Ilios", title: "Master VOD" },
				vodId: "vod_2",
			},
			{
				attempts: [],
				completedAt: null,
				createdAt: new Date("2026-01-03T11:00:00.000Z"),
				id: "run_test_account",
				moduleSelections: [],
				scenarioSnapshots: [],
				status: "COMPLETED",
				user: { isTestAccount: true },
				userId: "player_1",
				vod: { id: "vod_1" },
				vodId: "vod_1",
			},
		];
		vi.mocked(db.query.playthroughs.findMany).mockResolvedValueOnce(
			mockPlaythroughs as never,
		);

		// Act
		const result = await queryPlayerHistory("player_1", {
			modules: ["STRATEGY"],
			page: 1,
			pageSize: 10,
			status: "COMPLETED",
			vodId: "vod_1",
		});

		// Assert
		expect(result.total).toBe(1);
		expect(result.page).toBe(1);
		expect(result.pageSize).toBe(10);
		expect(result.totalPages).toBe(1);
		expect(result.items[0]).toMatchObject({
			accuracy: 50,
			id: "run_1",
			medianLatencyMs: 1500,
		});
	});

	it("filters out playthroughs when vod or module do not match, or when default options are used", async () => {
		// Arrange
		const db = await getDb();
		const mockPlaythroughs = [
			{
				attempts: [],
				completedAt: new Date("2026-01-01T12:00:00.000Z"),
				createdAt: new Date("2026-01-01T11:00:00.000Z"),
				id: "run_1",
				moduleSelections: [{ moduleType: "STRATEGY" }],
				scenarioSnapshots: [],
				status: "COMPLETED",
				user: { isTestAccount: false },
				userId: "player_1",
				vod: { id: "vod_1" },
				vodId: "vod_1",
			},
		];
		vi.mocked(db.query.playthroughs.findMany).mockResolvedValueOnce(
			mockPlaythroughs as never,
		);

		// Act - query with non matching VOD and non matching module
		const resultNoMatch = await queryPlayerHistory("player_1", {
			modules: ["COOLDOWN"],
			vodId: "vod_999",
		});

		// Assert
		expect(resultNoMatch.total).toBe(0);

		// Act - query with default options
		vi.mocked(db.query.playthroughs.findMany).mockResolvedValueOnce(
			mockPlaythroughs as never,
		);
		const resultDefault = await queryPlayerHistory("player_1");
		expect(resultDefault.total).toBe(1);
	});

	it("returns empty result when page exceeds total pages", async () => {
		// Arrange
		const db = await getDb();
		const mockPlaythroughs = [
			{
				attempts: [],
				completedAt: new Date("2026-01-01T12:00:00.000Z"),
				createdAt: new Date("2026-01-01T11:00:00.000Z"),
				id: "run_1",
				moduleSelections: [],
				scenarioSnapshots: [],
				status: "COMPLETED",
				user: { isTestAccount: false },
				userId: "player_1",
				vod: { id: "vod_1" },
				vodId: "vod_1",
			},
		];
		vi.mocked(db.query.playthroughs.findMany).mockResolvedValueOnce(
			mockPlaythroughs as never,
		);

		// Act
		const result = await queryPlayerHistory("player_1", {
			page: 5,
			pageSize: 10,
		});

		// Assert
		expect(result.total).toBe(1);
		expect(result.items).toHaveLength(0);
	});

	it("loads full history detail for owned playthrough when not test account", async () => {
		// Arrange
		const db = await getDb();
		const detail = {
			attempts: [
				{
					id: "a1",
					inputValue: null,
					isCorrect: true,
					isTimedOut: false,
					responseTimeMs: 1200,
					scenarioSnapshotId: "snap_1",
					selectedOptionId: "opt_1",
				},
			],
			completedAt: new Date("2026-01-01T12:00:00.000Z"),
			completion: {
				completedAt: new Date("2026-01-01T12:00:00.000Z"),
				id: "comp_1",
			},
			createdAt: new Date("2026-01-01T11:00:00.000Z"),
			id: "run_1",
			moduleSelections: [{ moduleType: "STRATEGY" }],
			scenarioSnapshots: [
				{
					explanationText: "High ground gives safety.",
					id: "snap_1",
					imageUrl: null,
					inputConfig: {},
					inputType: "MULTIPLE_CHOICE",
					moduleType: "STRATEGY",
					position: 0,
					promptText: "Where to hold?",
					scenarioId: "scen_1",
					timeLimitSeconds: 15,
					timestampSeconds: 60,
				},
			],
			status: "COMPLETED",
			user: { isTestAccount: false },
			userId: "player_1",
			vod: {
				durationSeconds: 1200,
				id: "vod_1",
				mapName: "King's Row",
				rankTier: "Grandmaster",
				title: "GM Ana Gameplay",
				youtubeVideoId: "yt123",
			},
			vodId: "vod_1",
		};
		vi.mocked(db.query.playthroughs.findFirst).mockResolvedValueOnce(
			detail as never,
		);

		// Act
		const result = await getPlaythroughHistoryDetail("run_1", "player_1");

		// Assert
		expect(result).toMatchObject({
			accuracy: 100,
			id: "run_1",
			medianLatencyMs: 1200,
			vod: { title: "GM Ana Gameplay" },
		});
	});

	it("returns null when detail playthrough is not found or owned by another user", async () => {
		// Arrange
		const db = await getDb();
		vi.mocked(db.query.playthroughs.findFirst).mockResolvedValueOnce(
			null as never,
		);

		// Act
		const result = await getPlaythroughHistoryDetail("unowned_run", "player_1");

		// Assert
		expect(result).toBeNull();
	});

	it("returns null when detail playthrough belongs to a test account", async () => {
		// Arrange
		const db = await getDb();
		vi.mocked(db.query.playthroughs.findFirst).mockResolvedValueOnce({
			id: "test_run",
			user: { isTestAccount: true },
		} as never);

		// Act
		const result = await getPlaythroughHistoryDetail("test_run", "player_1");

		// Assert
		expect(result).toBeNull();
	});
});
