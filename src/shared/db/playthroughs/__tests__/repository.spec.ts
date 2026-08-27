import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "../../core/client";
import {
	completePlaythrough,
	createPlaythrough,
	getAttemptByIdempotencyKey,
	getPlayerHistory,
	getPlaythrough,
	getPlaythroughAttempts,
	getPlaythroughHistoryDetail,
	IDEMPOTENCY_CONFLICT_ERROR,
	PLAYTHROUGH_START_CONFLICT_ERROR,
	queryPlayerHistory,
	recordPlaythroughAttempt,
} from "../repository";

vi.mock("../../core/client");

describe("playthroughs repository", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("createPlaythrough", () => {
		it("creates playthrough with modules and snapshots in transaction", async () => {
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
				id: "custom_pt_id",
				modules: ["STRATEGY"],
				scenarios: [
					{
						explanationText: "E",
						id: "snap_1",
						inputConfig: { opt: 1 },
						inputType: "MULTIPLE_CHOICE",
						moduleType: "STRATEGY",
						promptText: "P",
						scenarioId: "sc_1",
						timeLimitSeconds: 15,
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

		it("creates a playthrough with scenario snapshots without explicit id", async () => {
			// Arrange
			const mockPlaythrough = {
				id: "pt_1",
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
						inputConfig: { opt: 1 },
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

		it("creates a playthrough with empty modules and scenarios", async () => {
			// Arrange
			const mockPlaythrough = {
				id: "pt_empty",
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
				modules: [],
				scenarios: [],
				userId: "usr_1",
				vodId: "vod_1",
			});

			// Assert
			expect(result).toEqual({
				data: mockPlaythrough,
				success: true,
			});
		});

		it("throws and handles error when insert returns empty array", async () => {
			// Arrange
			const mockTx = {
				insert: vi.fn().mockReturnValue({
					values: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([]),
					}),
				}),
			};
			const mockDb = {
				transaction: vi.fn((cb: (tx: typeof mockTx) => unknown) => cb(mockTx)),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await createPlaythrough({
				modules: [],
				scenarios: [],
				userId: "usr_1",
				vodId: "vod_1",
			});

			// Assert
			expect(result).toEqual({
				error: "Failed to create playthrough",
				success: false,
			});
		});

		it("handles unique constraint error and returns existing matching playthrough", async () => {
			// Arrange
			const existing = {
				id: "pt_idempotent",
				moduleSelections: [{ moduleType: "STRATEGY" }],
				scenarioSnapshots: [
					{
						explanationText: "E",
						id: "snap_1",
						imageUrl: null,
						inputConfig: { opt: 1 },
						inputType: "MULTIPLE_CHOICE",
						moduleType: "STRATEGY",
						position: 0,
						promptText: "P",
						scenarioId: "sc_1",
						timeLimitSeconds: null,
						timestampSeconds: 10,
					},
				],
				userId: "usr_1",
				vodId: "vod_1",
			};
			const mockDb = {
				query: {
					playthroughs: {
						findFirst: vi.fn().mockImplementation((options) => {
							if (options?.where) {
								options.where(
									{ id: "pt_idempotent", userId: "usr_1" },
									{ and: vi.fn(), eq: vi.fn() },
								);
							}
							return Promise.resolve(existing);
						}),
					},
				},
				transaction: vi
					.fn()
					.mockRejectedValue(
						new Error("UNIQUE constraint failed: playthrough.id"),
					),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await createPlaythrough({
				id: "pt_idempotent",
				modules: ["STRATEGY"],
				scenarios: [
					{
						explanationText: "E",
						inputConfig: { opt: 1 },
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
				data: existing,
				success: true,
			});
		});

		it("returns conflict error when existing playthrough does not match start request", async () => {
			// Arrange
			const existing = {
				id: "pt_idempotent",
				moduleSelections: [{ moduleType: "STRATEGY" }],
				scenarioSnapshots: [],
				userId: "usr_1",
				vodId: "vod_1",
			};
			const mockDb = {
				query: {
					playthroughs: {
						findFirst: vi.fn().mockImplementation((options) => {
							if (options?.where) {
								options.where(
									{ id: "pt_idempotent", userId: "usr_1" },
									{ and: vi.fn(), eq: vi.fn() },
								);
							}
							return Promise.resolve(existing);
						}),
					},
				},
				transaction: vi
					.fn()
					.mockRejectedValue(
						new Error("UNIQUE constraint failed: playthrough.id"),
					),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await createPlaythrough({
				id: "pt_idempotent",
				modules: ["STRATEGY"],
				scenarios: [
					{
						explanationText: "Different",
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
				error: PLAYTHROUGH_START_CONFLICT_ERROR,
				success: false,
			});
		});

		it("returns conflict error when getPlaythrough returns null on unique constraint error", async () => {
			// Arrange
			const mockDb = {
				query: {
					playthroughs: {
						findFirst: vi.fn().mockResolvedValue(null),
					},
				},
				transaction: vi
					.fn()
					.mockRejectedValue(
						new Error("UNIQUE constraint failed: playthrough.id"),
					),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await createPlaythrough({
				id: "pt_idempotent",
				modules: ["STRATEGY"],
				scenarios: [],
				userId: "usr_1",
				vodId: "vod_1",
			});

			// Assert
			expect(result).toEqual({
				error: PLAYTHROUGH_START_CONFLICT_ERROR,
				success: false,
			});
		});

		it("handles unexpected non-unique error during creation", async () => {
			// Arrange
			const mockDb = {
				transaction: vi.fn().mockRejectedValue(new Error("Connection error")),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await createPlaythrough({
				modules: [],
				scenarios: [],
				userId: "usr_1",
				vodId: "vod_1",
			});

			// Assert
			expect(result).toEqual({
				error: "Connection error",
				success: false,
			});
		});
	});

	describe("getPlaythrough", () => {
		it("returns playthrough details when found", async () => {
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
							if (options?.where) {
								options.where(
									{ id: "pt_1", userId: "usr_1" },
									{ and: vi.fn(), eq: vi.fn() },
								);
							}
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

		it("returns null data when not found", async () => {
			// Arrange
			const mockDb = {
				query: {
					playthroughs: {
						findFirst: vi.fn().mockImplementation((options) => {
							if (options?.where) {
								options.where(
									{ id: "pt_missing", userId: "usr_1" },
									{ and: vi.fn(), eq: vi.fn() },
								);
							}
							return Promise.resolve(null);
						}),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await getPlaythrough("pt_missing", "usr_1");

			// Assert
			expect(result).toEqual({
				data: null,
				success: true,
			});
		});

		it("handles query failure", async () => {
			// Arrange
			vi.mocked(getDb).mockRejectedValue(new Error("Query failed"));

			// Act
			const result = await getPlaythrough("pt_1", "usr_1");

			// Assert
			expect(result).toEqual({
				error: "Query failed",
				success: false,
			});
		});
	});

	describe("getPlayerHistory", () => {
		it("returns non-test playthroughs", async () => {
			// Arrange
			const mockRuns = [
				{ id: "run_1", user: { isTestAccount: false } },
				{ id: "run_test", user: { isTestAccount: true } },
			];
			const mockDb = {
				query: {
					playthroughs: {
						findMany: vi.fn().mockImplementation((options) => {
							if (options?.where) {
								options.where({ userId: "usr_1" }, { eq: vi.fn() });
							}
							return Promise.resolve(mockRuns);
						}),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await getPlayerHistory("usr_1");

			// Assert
			expect(result).toEqual({
				data: [{ id: "run_1", user: { isTestAccount: false } }],
				success: true,
			});
		});

		it("handles database errors", async () => {
			// Arrange
			vi.mocked(getDb).mockRejectedValue(new Error("History fetch error"));

			// Act
			const result = await getPlayerHistory("usr_1");

			// Assert
			expect(result).toEqual({
				error: "History fetch error",
				success: false,
			});
		});
	});

	describe("queryPlayerHistory", () => {
		it("queries and paginates history with metric calculations", async () => {
			// Arrange
			const mockRuns = [
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
					completion: {
						completedAt: new Date("2026-01-01T12:00:00.000Z"),
						id: "c1",
					},
					createdAt: new Date("2026-01-01T11:00:00.000Z"),
					id: "run_1",
					moduleSelections: [{ moduleType: "STRATEGY" }],
					scenarioSnapshots: [{ id: "s1" }, { id: "s2" }],
					status: "COMPLETED",
					user: { isTestAccount: false },
					userId: "usr_1",
					vod: { id: "vod_1", mapName: "King's Row", title: "GM VOD" },
					vodId: "vod_1",
				},
				{
					attempts: [],
					completedAt: null,
					completion: null,
					createdAt: new Date("2026-01-02T11:00:00.000Z"),
					id: "run_2",
					moduleSelections: [{ moduleType: "TACTICS" }],
					scenarioSnapshots: [{ id: "s3" }],
					status: "IN_PROGRESS",
					user: { isTestAccount: false },
					userId: "usr_1",
					vod: { id: "vod_2", mapName: "Ilios", title: "Master VOD" },
					vodId: "vod_2",
				},
				{
					attempts: [],
					completedAt: null,
					completion: null,
					createdAt: new Date("2026-01-03T11:00:00.000Z"),
					id: "run_test",
					moduleSelections: [],
					scenarioSnapshots: [],
					status: "COMPLETED",
					user: { isTestAccount: true },
					userId: "usr_1",
					vod: { id: "vod_1" },
					vodId: "vod_1",
				},
			];
			const mockDb = {
				query: {
					playthroughs: {
						findMany: vi.fn().mockImplementation((options) => {
							if (options?.where) {
								options.where({ userId: "usr_1" }, { eq: vi.fn() });
							}
							if (options?.with?.scenarioSnapshots?.orderBy) {
								options.with.scenarioSnapshots.orderBy({}, { asc: vi.fn() });
							}
							return Promise.resolve(mockRuns);
						}),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await queryPlayerHistory("usr_1", {
				modules: ["STRATEGY"],
				page: 1,
				pageSize: 10,
				status: "COMPLETED",
				vodId: "vod_1",
			});

			// Assert
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.total).toBe(1);
				expect(result.data.items[0]?.accuracy).toBe(50);
				expect(result.data.items[0]?.medianLatencyMs).toBe(1500);
			}
		});

		it("filters out runs that do not match filters", async () => {
			// Arrange
			const mockRuns = [
				{
					attempts: [],
					completedAt: null,
					completion: null,
					createdAt: new Date(),
					id: "run_1",
					moduleSelections: [{ moduleType: "STRATEGY" }],
					scenarioSnapshots: [],
					status: "IN_PROGRESS",
					user: { isTestAccount: false },
					userId: "usr_1",
					vodId: "vod_1",
				},
			];
			const mockDb = {
				query: {
					playthroughs: {
						findMany: vi.fn().mockImplementation((options) => {
							if (options?.where) {
								options.where({ userId: "usr_1" }, { eq: vi.fn() });
							}
							return Promise.resolve(mockRuns);
						}),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const resStatus = await queryPlayerHistory("usr_1", {
				status: "COMPLETED",
			});
			const resVod = await queryPlayerHistory("usr_1", { vodId: "vod_other" });
			const resModule = await queryPlayerHistory("usr_1", {
				modules: ["TACTICS"],
			});
			const resEmptyModules = await queryPlayerHistory("usr_1", {
				modules: [],
			});
			const resDefault = await queryPlayerHistory("usr_1", {});

			// Assert
			expect(resStatus.success && resStatus.data.total).toBe(0);
			expect(resVod.success && resVod.data.total).toBe(0);
			expect(resModule.success && resModule.data.total).toBe(0);
			expect(resEmptyModules.success && resEmptyModules.data.total).toBe(1);
			expect(resDefault.success && resDefault.data.total).toBe(1);
		});

		it("handles query error", async () => {
			// Arrange
			vi.mocked(getDb).mockRejectedValue(new Error("Query failed"));

			// Act
			const result = await queryPlayerHistory("usr_1");

			// Assert
			expect(result).toEqual({
				error: "Query failed",
				success: false,
			});
		});
	});

	describe("getPlaythroughHistoryDetail", () => {
		it("returns mapped detail for non-test owned playthrough", async () => {
			// Arrange
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
			const mockDb = {
				query: {
					playthroughs: {
						findFirst: vi.fn().mockImplementation((options) => {
							if (options?.where) {
								options.where(
									{ id: "run_1", userId: "player_1" },
									{ and: vi.fn(), eq: vi.fn() },
								);
							}
							if (options?.with?.scenarioSnapshots?.orderBy) {
								options.with.scenarioSnapshots.orderBy({}, { asc: vi.fn() });
							}
							return Promise.resolve(detail);
						}),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await getPlaythroughHistoryDetail("run_1", "player_1");

			// Assert
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data?.id).toBe("run_1");
				expect(result.data?.accuracy).toBe(100);
			}
		});

		it("returns null for not found or test account playthroughs", async () => {
			// Arrange
			const mockDb = {
				query: {
					playthroughs: {
						findFirst: vi
							.fn()
							.mockImplementationOnce((options) => {
								if (options?.where)
									options.where(
										{ id: "missing", userId: "player_1" },
										{ and: vi.fn(), eq: vi.fn() },
									);
								return Promise.resolve(null);
							})
							.mockImplementationOnce((options) => {
								if (options?.where)
									options.where(
										{ id: "test_run", userId: "player_1" },
										{ and: vi.fn(), eq: vi.fn() },
									);
								return Promise.resolve({
									id: "test_run",
									user: { isTestAccount: true },
								});
							}),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const resNotFound = await getPlaythroughHistoryDetail(
				"missing",
				"player_1",
			);
			const resTest = await getPlaythroughHistoryDetail("test_run", "player_1");

			// Assert
			expect(resNotFound).toEqual({ data: null, success: true });
			expect(resTest).toEqual({ data: null, success: true });
		});

		it("handles database error", async () => {
			// Arrange
			vi.mocked(getDb).mockRejectedValue(new Error("Detail error"));

			// Act
			const result = await getPlaythroughHistoryDetail("run_1", "player_1");

			// Assert
			expect(result).toEqual({
				error: "Detail error",
				success: false,
			});
		});
	});

	describe("completePlaythrough", () => {
		it("completes playthrough and creates completion in transaction", async () => {
			// Arrange
			const mockCompletion = {
				completedAt: new Date(),
				id: "comp_1",
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
							returning: vi.fn().mockResolvedValue([{ id: "pt_1" }]),
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

		it("returns existing completion when playthrough was already completed", async () => {
			// Arrange
			const existingCompletion = {
				completedAt: new Date(),
				id: "comp_existing",
				playthroughId: "pt_1",
				userId: "usr_1",
			};
			const mockTx = {
				update: vi.fn().mockReturnValue({
					set: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							returning: vi.fn().mockResolvedValue([]),
						}),
					}),
				}),
			};
			const mockDb = {
				query: {
					playthroughCompletions: {
						findFirst: vi.fn().mockImplementation((options) => {
							if (options?.where) {
								options.where(
									{ playthroughId: "pt_1", userId: "usr_1" },
									{ and: vi.fn(), eq: vi.fn() },
								);
							}
							return Promise.resolve(existingCompletion);
						}),
					},
				},
				transaction: vi.fn((cb: (tx: typeof mockTx) => unknown) => cb(mockTx)),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await completePlaythrough("pt_1", "usr_1");

			// Assert
			expect(result).toEqual({
				data: existingCompletion,
				success: true,
			});
		});

		it("returns null data when playthrough was already completed and no completion record exists", async () => {
			// Arrange
			const mockTx = {
				update: vi.fn().mockReturnValue({
					set: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							returning: vi.fn().mockResolvedValue([]),
						}),
					}),
				}),
			};
			const mockDb = {
				query: {
					playthroughCompletions: {
						findFirst: vi.fn().mockResolvedValue(null),
					},
				},
				transaction: vi.fn((cb: (tx: typeof mockTx) => unknown) => cb(mockTx)),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await completePlaythrough("pt_1", "usr_1");

			// Assert
			expect(result).toEqual({
				data: null,
				success: true,
			});
		});

		it("handles unique constraint error and returns existing completion", async () => {
			// Arrange
			const existingCompletion = {
				completedAt: new Date(),
				id: "comp_existing",
				playthroughId: "pt_1",
				userId: "usr_1",
			};
			const mockDb = {
				query: {
					playthroughCompletions: {
						findFirst: vi.fn().mockImplementation((options) => {
							if (options?.where) {
								options.where(
									{ playthroughId: "pt_1", userId: "usr_1" },
									{ and: vi.fn(), eq: vi.fn() },
								);
							}
							return Promise.resolve(existingCompletion);
						}),
					},
				},
				transaction: vi
					.fn()
					.mockRejectedValue(
						new Error(
							"UNIQUE constraint failed: playthrough_completion.playthrough_id",
						),
					),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await completePlaythrough("pt_1", "usr_1");

			// Assert
			expect(result).toEqual({
				data: existingCompletion,
				success: true,
			});
		});

		it("handles unique constraint error and returns null if completion not found", async () => {
			// Arrange
			const mockDb = {
				query: {
					playthroughCompletions: {
						findFirst: vi.fn().mockResolvedValue(null),
					},
				},
				transaction: vi
					.fn()
					.mockRejectedValue(
						new Error(
							"UNIQUE constraint failed: playthrough_completion.playthrough_id",
						),
					),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await completePlaythrough("pt_1", "usr_1");

			// Assert
			expect(result).toEqual({
				data: null,
				success: true,
			});
		});

		it("handles unexpected error during completePlaythrough", async () => {
			// Arrange
			const mockDb = {
				transaction: vi.fn().mockRejectedValue(new Error("Disk full")),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await completePlaythrough("pt_1", "usr_1");

			// Assert
			expect(result).toEqual({
				error: "Disk full",
				success: false,
			});
		});
	});

	describe("recordPlaythroughAttempt", () => {
		it("records attempt successfully", async () => {
			// Arrange
			const mockAttempt = {
				id: "att_1",
				idempotencyKey: "idem_1",
				isCorrect: true,
				playthroughId: "pt_1",
				responseTimeMs: 1000,
				scenarioId: "sc_1",
				scenarioSnapshotId: "snap_1",
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
				idempotencyKey: "idem_1",
				isCorrect: true,
				playthroughId: "pt_1",
				responseTimeMs: 1000,
				scenarioId: "sc_1",
				scenarioSnapshotId: "snap_1",
				userId: "usr_1",
			});

			// Assert
			expect(result).toEqual({
				data: mockAttempt,
				success: true,
			});
		});

		it("handles empty returning from insert", async () => {
			// Arrange
			const mockDb = {
				insert: vi.fn().mockReturnValue({
					values: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([]),
					}),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await recordPlaythroughAttempt({
				idempotencyKey: "idem_1",
				isCorrect: true,
				playthroughId: "pt_1",
				responseTimeMs: 1000,
				scenarioId: "sc_1",
				scenarioSnapshotId: "snap_1",
				userId: "usr_1",
			});

			// Assert
			expect(result).toEqual({
				data: null,
				success: true,
			});
		});

		it("returns existing matching attempt on idempotency collision", async () => {
			// Arrange
			const existing = {
				id: "att_1",
				idempotencyKey: "idem_1",
				inputValue: { opt: "A" },
				isCorrect: true,
				isTimedOut: false,
				playthroughId: "pt_1",
				responseTimeMs: 1000,
				scenarioId: "sc_1",
				scenarioSnapshotId: "snap_1",
				selectedOptionId: "opt_1",
				userId: "usr_1",
			};
			const mockDb = {
				insert: vi.fn().mockReturnValue({
					values: vi.fn().mockReturnValue({
						returning: vi
							.fn()
							.mockRejectedValue(
								new Error(
									"UNIQUE constraint failed: attempt_record.idempotency_key",
								),
							),
					}),
				}),
				query: {
					attemptRecords: {
						findFirst: vi.fn().mockImplementation((options) => {
							if (options?.where) {
								options.where(
									{ idempotencyKey: "idem_1", userId: "usr_1" },
									{ and: vi.fn(), eq: vi.fn() },
								);
							}
							return Promise.resolve(existing);
						}),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await recordPlaythroughAttempt({
				idempotencyKey: "idem_1",
				inputValue: { opt: "A" },
				isCorrect: true,
				playthroughId: "pt_1",
				responseTimeMs: 1000,
				scenarioId: "sc_1",
				scenarioSnapshotId: "snap_1",
				selectedOptionId: "opt_1",
				userId: "usr_1",
			});

			// Assert
			expect(result).toEqual({
				data: existing,
				success: true,
			});
		});

		it("returns existing matching attempt on idempotency collision with omitted optional fields", async () => {
			// Arrange
			const existing = {
				id: "att_1",
				idempotencyKey: "idem_1",
				inputValue: null,
				isCorrect: true,
				isTimedOut: false,
				playthroughId: "pt_1",
				responseTimeMs: 1000,
				scenarioId: "sc_1",
				scenarioSnapshotId: "snap_1",
				selectedOptionId: null,
				userId: "usr_1",
			};
			const mockDb = {
				insert: vi.fn().mockReturnValue({
					values: vi.fn().mockReturnValue({
						returning: vi
							.fn()
							.mockRejectedValue(
								new Error(
									"UNIQUE constraint failed: attempt_record.idempotency_key",
								),
							),
					}),
				}),
				query: {
					attemptRecords: {
						findFirst: vi.fn().mockImplementation((options) => {
							if (options?.where) {
								options.where(
									{ idempotencyKey: "idem_1", userId: "usr_1" },
									{ and: vi.fn(), eq: vi.fn() },
								);
							}
							return Promise.resolve(existing);
						}),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await recordPlaythroughAttempt({
				idempotencyKey: "idem_1",
				isCorrect: true,
				playthroughId: "pt_1",
				responseTimeMs: 1000,
				scenarioId: "sc_1",
				scenarioSnapshotId: "snap_1",
				userId: "usr_1",
			});

			// Assert
			expect(result).toEqual({
				data: existing,
				success: true,
			});
		});

		it("returns conflict error when idempotency key is reused for different data", async () => {
			// Arrange
			const existing = {
				id: "att_1",
				idempotencyKey: "idem_1",
				inputValue: null,
				isCorrect: false,
				isTimedOut: false,
				playthroughId: "pt_1",
				responseTimeMs: 1000,
				scenarioId: "sc_1",
				scenarioSnapshotId: "snap_1",
				selectedOptionId: null,
				userId: "usr_1",
			};
			const mockDb = {
				insert: vi.fn().mockReturnValue({
					values: vi.fn().mockReturnValue({
						returning: vi
							.fn()
							.mockRejectedValue(
								new Error(
									"UNIQUE constraint failed: attempt_record.idempotency_key",
								),
							),
					}),
				}),
				query: {
					attemptRecords: {
						findFirst: vi.fn().mockImplementation((options) => {
							if (options?.where) {
								options.where(
									{ idempotencyKey: "idem_1", userId: "usr_1" },
									{ and: vi.fn(), eq: vi.fn() },
								);
							}
							return Promise.resolve(existing);
						}),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await recordPlaythroughAttempt({
				idempotencyKey: "idem_1",
				isCorrect: true,
				playthroughId: "pt_1",
				responseTimeMs: 1000,
				scenarioId: "sc_1",
				scenarioSnapshotId: "snap_1",
				userId: "usr_1",
			});

			// Assert
			expect(result).toEqual({
				error: IDEMPOTENCY_CONFLICT_ERROR,
				success: false,
			});
		});

		it("handles unexpected insert error", async () => {
			// Arrange
			const mockDb = {
				insert: vi.fn().mockReturnValue({
					values: vi.fn().mockReturnValue({
						returning: vi.fn().mockRejectedValue(new Error("D1 offline")),
					}),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await recordPlaythroughAttempt({
				idempotencyKey: "idem_1",
				isCorrect: true,
				playthroughId: "pt_1",
				responseTimeMs: 1000,
				scenarioId: "sc_1",
				scenarioSnapshotId: "snap_1",
				userId: "usr_1",
			});

			// Assert
			expect(result).toEqual({
				error: "D1 offline",
				success: false,
			});
		});
	});

	describe("getPlaythroughAttempts and getAttemptByIdempotencyKey", () => {
		it("getPlaythroughAttempts returns list of attempts", async () => {
			// Arrange
			const mockAttempts = [{ id: "att_1", playthroughId: "pt_1" }];
			const mockDb = {
				query: {
					attemptRecords: {
						findMany: vi.fn().mockImplementation((options) => {
							if (options?.where) {
								options.where(
									{ playthroughId: "pt_1", userId: "usr_1" },
									{ and: vi.fn(), eq: vi.fn() },
								);
							}
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

		it("getPlaythroughAttempts handles query error", async () => {
			// Arrange
			vi.mocked(getDb).mockRejectedValue(new Error("Fetch failed"));

			// Act
			const result = await getPlaythroughAttempts("pt_1", "usr_1");

			// Assert
			expect(result).toEqual({
				error: "Fetch failed",
				success: false,
			});
		});

		it("getAttemptByIdempotencyKey returns attempt or null", async () => {
			// Arrange
			const mockAttempt = { id: "att_1", idempotencyKey: "key_1" };
			const mockDb = {
				query: {
					attemptRecords: {
						findFirst: vi
							.fn()
							.mockImplementationOnce((options) => {
								if (options?.where) {
									options.where(
										{ idempotencyKey: "key_1", userId: "usr_1" },
										{ and: vi.fn(), eq: vi.fn() },
									);
								}
								return Promise.resolve(mockAttempt);
							})
							.mockImplementationOnce((options) => {
								if (options?.where) {
									options.where(
										{ idempotencyKey: "key_missing", userId: "usr_1" },
										{ and: vi.fn(), eq: vi.fn() },
									);
								}
								return Promise.resolve(null);
							}),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await getAttemptByIdempotencyKey("key_1", "usr_1");
			const resultNull = await getAttemptByIdempotencyKey(
				"key_missing",
				"usr_1",
			);

			// Assert
			expect(result).toEqual({
				data: mockAttempt,
				success: true,
			});
			expect(resultNull).toEqual({
				data: null,
				success: true,
			});
		});

		it("getAttemptByIdempotencyKey handles query error", async () => {
			// Arrange
			vi.mocked(getDb).mockRejectedValue(new Error("Key lookup failed"));

			// Act
			const result = await getAttemptByIdempotencyKey("key_1", "usr_1");

			// Assert
			expect(result).toEqual({
				error: "Key lookup failed",
				success: false,
			});
		});
	});
});
