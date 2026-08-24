import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "../../client/client";
import {
	completePlaythrough,
	createPlaythrough,
	getAttemptByIdempotencyKey,
	getPlayerHistory,
	getPlaythrough,
	getPlaythroughAttempts,
	getPlaythroughHistoryDetail,
	queryPlayerHistory,
	recordPlaythroughAttempt,
} from "../repository";

vi.mock("../../client/client");

describe("playthroughs repository", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("createPlaythrough creates playthrough with modules and snapshots in transaction", async () => {
		// Arrange
		const mockPlaythrough = {
			completedAt: null,
			createdAt: new Date(),
			id: "pt_1",
			status: "IN_PROGRESS" as const,
			userId: "usr_1",
			vodId: "vod_1",
		};
		const mockTx = {
			insert: vi.fn().mockReturnValue({
				values: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([mockPlaythrough]),
				}),
			}),
		};
		const mockDb = {
			transaction: vi.fn((cb: (tx: typeof mockTx) => unknown) => cb(mockTx)),
		};
		vi.mocked(getDb).mockResolvedValue(mockDb as never);

		// Act
		const result = await createPlaythrough({
			modules: ["STRATEGY"],
			scenarios: [
				{
					explanationText: "E",
					inputConfig: {},
					inputType: "MULTIPLE_CHOICE",
					moduleType: "STRATEGY",
					promptText: "P",
					scenarioId: "sc_1",
					timestampSeconds: 10,
				},
			],
			userId: "usr_1",
			vodId: "vod_1",
		});

		// Assert
		expect(result).toEqual({
			data: mockPlaythrough,
			success: true,
		});
	});

	it("getPlaythrough returns playthrough details with attempts and snapshots", async () => {
		// Arrange
		const mockPlaythrough = {
			attempts: [],
			id: "pt_1",
			moduleSelections: [{ moduleType: "STRATEGY" }],
			scenarioSnapshots: [{ position: 0, scenarioId: "sc_1" }],
			userId: "usr_1",
		};
		const mockDb = {
			query: {
				playthroughs: {
					findFirst: vi.fn().mockImplementation((options) => {
						if (options?.with?.scenarioSnapshots?.orderBy) {
							options.with.scenarioSnapshots.orderBy({}, { asc: vi.fn() });
						}
						return Promise.resolve(mockPlaythrough);
					}),
				},
			},
		};
		vi.mocked(getDb).mockResolvedValue(mockDb as never);

		// Act
		const result = await getPlaythrough("pt_1", "usr_1");

		// Assert
		expect(result).toEqual({
			data: mockPlaythrough,
			success: true,
		});
	});

	it("getPlayerHistory filters out test accounts", async () => {
		// Arrange
		const mockRuns = [
			{ id: "1", user: { isTestAccount: false } },
			{ id: "2", user: { isTestAccount: true } },
		];
		const mockDb = {
			query: {
				playthroughs: {
					findMany: vi.fn().mockResolvedValue(mockRuns),
				},
			},
		};
		vi.mocked(getDb).mockResolvedValue(mockDb as never);

		// Act
		const result = await getPlayerHistory("usr_1");

		// Assert
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toHaveLength(1);
			expect(result.data[0]?.id).toBe("1");
		}
	});

	it("queryPlayerHistory paginates and computes accuracy and median latency", async () => {
		// Arrange
		const mockRuns = [
			{
				attempts: [
					{
						id: "a1",
						inputValue: null,
						isCorrect: true,
						isTimedOut: false,
						responseTimeMs: 1200,
						scenarioSnapshotId: "ss1",
						selectedOptionId: "opt1",
					},
				],
				completedAt: new Date(),
				completion: { completedAt: new Date(), id: "c1" },
				createdAt: new Date(),
				id: "pt_1",
				moduleSelections: [{ moduleType: "STRATEGY" }],
				scenarioSnapshots: [
					{
						explanationText: "E",
						id: "ss1",
						imageUrl: null,
						inputConfig: {},
						inputType: "MULTIPLE_CHOICE" as const,
						moduleType: "STRATEGY" as const,
						position: 0,
						promptText: "P",
						scenarioId: "sc_1",
						timeLimitSeconds: null,
						timestampSeconds: 10,
					},
				],
				status: "COMPLETED" as const,
				user: { isTestAccount: false },
				userId: "usr_1",
				vod: {
					durationSeconds: 600,
					id: "vod_1",
					mapName: "Map",
					rankTier: "Diamond",
					title: "Title",
					youtubeVideoId: "yt1",
				},
				vodId: "vod_1",
			},
		];
		const mockDb = {
			query: {
				playthroughs: {
					findMany: vi.fn().mockResolvedValue(mockRuns),
				},
			},
		};
		vi.mocked(getDb).mockResolvedValue(mockDb as never);

		// Act
		const result = await queryPlayerHistory("usr_1", { page: 1, pageSize: 10 });

		// Assert
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.total).toBe(1);
			expect(result.data.items[0]?.accuracy).toBe(100);
			expect(result.data.items[0]?.medianLatencyMs).toBe(1200);
		}
	});

	it("completePlaythrough updates status and inserts completion", async () => {
		// Arrange
		const completedAt = new Date();
		const mockPlaythrough = { id: "pt_1", status: "COMPLETED" };
		const mockCompletion = {
			completedAt,
			id: "c_1",
			playthroughId: "pt_1",
			userId: "usr_1",
		};
		const mockTx = {
			insert: vi.fn().mockReturnValue({
				values: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([mockCompletion]),
				}),
			}),
			update: vi.fn().mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([mockPlaythrough]),
					}),
				}),
			}),
		};
		const mockDb = {
			transaction: vi.fn((cb: (tx: typeof mockTx) => unknown) => cb(mockTx)),
		};
		vi.mocked(getDb).mockResolvedValue(mockDb as never);

		// Act
		const result = await completePlaythrough("pt_1", "usr_1");

		// Assert
		expect(result).toEqual({
			data: mockCompletion,
			success: true,
		});
	});

	it("recordPlaythroughAttempt inserts attempt record", async () => {
		// Arrange
		const mockAttempt = {
			createdAt: new Date(),
			id: "att_1",
			idempotencyKey: "key_1",
			inputValue: null,
			isCorrect: true,
			isTimedOut: false,
			playthroughId: "pt_1",
			responseTimeMs: 800,
			scenarioId: "sc_1",
			scenarioSnapshotId: "ss_1",
			selectedOptionId: "opt_1",
			userId: "usr_1",
		};
		const mockDb = {
			insert: vi.fn().mockReturnValue({
				values: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([mockAttempt]),
				}),
			}),
		};
		vi.mocked(getDb).mockResolvedValue(mockDb as never);

		// Act
		const result = await recordPlaythroughAttempt({
			idempotencyKey: "key_1",
			isCorrect: true,
			playthroughId: "pt_1",
			responseTimeMs: 800,
			scenarioId: "sc_1",
			scenarioSnapshotId: "ss_1",
			selectedOptionId: "opt_1",
			userId: "usr_1",
		});

		// Assert
		expect(result).toEqual({
			data: mockAttempt,
			success: true,
		});
	});

	it("getPlaythroughAttempts returns attempts in chronological order", async () => {
		// Arrange
		const mockAttempts = [{ createdAt: new Date(), id: "att_1" }];
		const mockDb = {
			query: {
				attemptRecords: {
					findMany: vi.fn().mockImplementation((options) => {
						if (options?.orderBy) {
							options.orderBy({}, { asc: vi.fn() });
						}
						return Promise.resolve(mockAttempts);
					}),
				},
			},
		};
		vi.mocked(getDb).mockResolvedValue(mockDb as never);

		// Act
		const result = await getPlaythroughAttempts("pt_1", "usr_1");

		// Assert
		expect(result).toEqual({
			data: mockAttempts,
			success: true,
		});
	});

	it("getAttemptByIdempotencyKey returns attempt matching key", async () => {
		// Arrange
		const mockAttempt = { id: "att_1", idempotencyKey: "key_1" };
		const mockDb = {
			query: {
				attemptRecords: {
					findFirst: vi.fn().mockResolvedValue(mockAttempt),
				},
			},
		};
		vi.mocked(getDb).mockResolvedValue(mockDb as never);

		// Act
		const result = await getAttemptByIdempotencyKey("key_1", "usr_1");

		// Assert
		expect(result).toEqual({
			data: mockAttempt,
			success: true,
		});
	});

	it("getPlaythroughHistoryDetail returns null for test account", async () => {
		// Arrange
		const mockPlaythrough = {
			id: "pt_1",
			user: { isTestAccount: true },
		};
		const mockDb = {
			query: {
				playthroughs: {
					findFirst: vi.fn().mockResolvedValue(mockPlaythrough),
				},
			},
		};
		vi.mocked(getDb).mockResolvedValue(mockDb as never);

		// Act
		const result = await getPlaythroughHistoryDetail("pt_1", "usr_1");

		// Assert
		expect(result).toEqual({
			data: null,
			success: true,
		});
	});
});
