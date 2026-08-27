import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "../../core/client";
import {
	completePlaythrough,
	createPlaythrough,
	getAttemptByIdempotencyKey,
	getPlayerHistory,
	getPlaythrough,
	getPlaythroughHistoryDetail,
	IDEMPOTENCY_CONFLICT_ERROR,
	PLAYTHROUGH_START_CONFLICT_ERROR,
	playthroughService,
	queryPlayerHistory,
	recordPlaythroughAttempt,
} from "../playthroughs.service";

vi.mock("../../core/client");

describe("playthroughService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("create", () => {
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
			const result = await playthroughService.create({
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

		it("creates a playthrough without explicit id or modules/scenarios", async () => {
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

		it("handles transaction returning empty and throws error", async () => {
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
			const result = await playthroughService.create({
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

		it("handles unique constraint collision and returns existing matching playthrough", async () => {
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
						findFirst: vi.fn().mockResolvedValue(existing),
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
			const result = await playthroughService.create({
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
						findFirst: vi.fn().mockResolvedValue(existing),
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
			const result = await playthroughService.create({
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

		it("returns conflict error when getById returns null on unique constraint error", async () => {
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
			const result = await playthroughService.create({
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

		it("handles unexpected errors during creation (Error and non-Error)", async () => {
			// Arrange
			const mockDbErr = {
				transaction: vi.fn().mockRejectedValue(new Error("Connection error")),
			};
			const mockDbStr = {
				transaction: vi.fn().mockRejectedValue("Str error"),
			};
			vi.mocked(getDb)
				.mockResolvedValueOnce(mockDbErr as never)
				.mockResolvedValueOnce(mockDbStr as never);

			// Act
			const res1 = await playthroughService.create({
				modules: [],
				scenarios: [],
				userId: "usr_1",
				vodId: "vod_1",
			});
			const res2 = await playthroughService.create({
				modules: [],
				scenarios: [],
				userId: "usr_1",
				vodId: "vod_1",
			});

			// Assert
			expect(res1).toEqual({
				error: "Connection error",
				success: false,
			});
			expect(res2).toEqual({
				error: "Failed to create playthrough",
				success: false,
			});
		});
	});

	describe("getById", () => {
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
			const result = await playthroughService.getById("pt_1", "usr_1");

			// Assert
			expect(result).toEqual({
				data: mockPlaythrough,
				success: true,
			});
		});

		it("returns null data when not found and delegates getPlaythrough", async () => {
			// Arrange
			const mockDb = {
				query: {
					playthroughs: {
						findFirst: vi.fn().mockResolvedValue(null),
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

		it("handles database errors (Error and non-Error)", async () => {
			// Arrange
			vi.mocked(getDb)
				.mockRejectedValueOnce(new Error("Lookup failure"))
				.mockRejectedValueOnce("String error");

			// Act
			const res1 = await playthroughService.getById("pt_1", "usr_1");
			const res2 = await playthroughService.getById("pt_1", "usr_1");

			// Assert
			expect(res1).toEqual({
				error: "Lookup failure",
				success: false,
			});
			expect(res2).toEqual({
				error: "Failed to retrieve playthrough",
				success: false,
			});
		});
	});

	describe("getPlayerHistory", () => {
		it("returns empty array if user is test account or missing", async () => {
			// Arrange
			const mockDbTest = {
				query: {
					users: {
						findFirst: vi.fn().mockResolvedValue({ isTestAccount: true }),
					},
				},
			};
			const mockDbNull = {
				query: {
					users: {
						findFirst: vi.fn().mockResolvedValue(null),
					},
				},
			};
			vi.mocked(getDb)
				.mockResolvedValueOnce(mockDbTest as never)
				.mockResolvedValueOnce(mockDbNull as never);

			// Act
			const resTest = await getPlayerHistory("usr_test");
			const resNull = await getPlayerHistory("usr_null");

			// Assert
			expect(resTest).toEqual({ data: [], success: true });
			expect(resNull).toEqual({ data: [], success: true });
		});

		it("returns playthroughs for valid non-test user", async () => {
			// Arrange
			const mockRuns = [{ id: "run_1" }];
			const mockDb = {
				query: {
					playthroughs: {
						findMany: vi.fn().mockImplementation((options) => {
							if (options?.where)
								options.where({ userId: "usr_1" }, { eq: vi.fn() });
							return Promise.resolve(mockRuns);
						}),
					},
					users: {
						findFirst: vi.fn().mockImplementation((options) => {
							if (options?.where)
								options.where({ id: "usr_1" }, { eq: vi.fn() });
							return Promise.resolve({ isTestAccount: false });
						}),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await getPlayerHistory("usr_1");

			// Assert
			expect(result).toEqual({ data: mockRuns, success: true });
		});

		it("handles database errors (Error and non-Error)", async () => {
			// Arrange
			vi.mocked(getDb)
				.mockRejectedValueOnce(new Error("Fetch err"))
				.mockRejectedValueOnce("Str err");

			// Act
			const res1 = await getPlayerHistory("usr_1");
			const res2 = await getPlayerHistory("usr_1");

			// Assert
			expect(res1).toEqual({ error: "Fetch err", success: false });
			expect(res2).toEqual({
				error: "Failed to retrieve player history",
				success: false,
			});
		});
	});

	describe("listHistory", () => {
		it("returns empty result if user is test account or not found", async () => {
			// Arrange
			const mockDb = {
				query: {
					users: {
						findFirst: vi.fn().mockResolvedValue({ isTestAccount: true }),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await playthroughService.listHistory("usr_test");

			// Assert
			expect(result).toEqual({
				data: {
					items: [],
					page: 1,
					pageSize: 10,
					total: 0,
					totalPages: 1,
				},
				success: true,
			});
		});

		it("queries history with filters (modules, status, vodId) and calculates metrics", async () => {
			// Arrange
			const mockRuns = [
				{
					attempts: [
						{
							id: "a1",
							inputValue: null,
							isCorrect: true,
							isTimedOut: false,
							responseTimeMs: 1000,
							scenarioSnapshotId: "s1",
							selectedOptionId: "opt1",
						},
						{
							id: "a2",
							inputValue: null,
							isCorrect: false,
							isTimedOut: false,
							responseTimeMs: 2000,
							scenarioSnapshotId: "s2",
							selectedOptionId: "opt2",
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
					scenarioSnapshots: [
						{
							explanationText: "E",
							id: "s1",
							imageUrl: null,
							inputConfig: {},
							inputType: "MULTIPLE_CHOICE",
							moduleType: "STRATEGY",
							position: 0,
							promptText: "P",
							scenarioId: "sc_1",
							timeLimitSeconds: 15,
							timestampSeconds: 10,
						},
						{
							explanationText: "E2",
							id: "s2",
							imageUrl: null,
							inputConfig: {},
							inputType: "MULTIPLE_CHOICE",
							moduleType: "STRATEGY",
							position: 1,
							promptText: "P2",
							scenarioId: "sc_2",
							timeLimitSeconds: 15,
							timestampSeconds: 20,
						},
					],
					status: "COMPLETED" as const,
					userId: "usr_1",
					vod: {
						durationSeconds: 600,
						id: "vod_1",
						mapName: "King's Row",
						rankTier: "GM",
						title: "GM VOD",
						youtubeVideoId: "yt1",
					},
					vodId: "vod_1",
				},
			];
			const createChainable = (res: unknown = [{ value: 1 }]) => {
				const chain = Promise.resolve(res) as unknown as {
					from: ReturnType<typeof vi.fn>;
					where: ReturnType<typeof vi.fn>;
				};
				chain.from = vi.fn().mockReturnValue(chain);
				chain.where = vi.fn().mockReturnValue(chain);
				return chain;
			};
			const mockDb = {
				query: {
					playthroughs: {
						findMany: vi.fn().mockImplementation((options) => {
							if (options?.where) {
								options.where(
									{
										id: "run_1",
										status: "COMPLETED",
										userId: "usr_1",
										vodId: "vod_1",
									},
									{ and: vi.fn(), eq: vi.fn(), inArray: vi.fn() },
								);
							}
							if (options?.with?.scenarioSnapshots?.orderBy) {
								options.with.scenarioSnapshots.orderBy({}, { asc: vi.fn() });
							}
							return Promise.resolve(mockRuns);
						}),
					},
					users: {
						findFirst: vi.fn().mockImplementation((options) => {
							if (options?.where) {
								options.where({ id: "usr_1" }, { eq: vi.fn() });
							}
							return Promise.resolve({ isTestAccount: false });
						}),
					},
				},
				select: vi
					.fn()
					.mockImplementation(() => createChainable([{ value: 1 }])),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act 1: With all filters
			const result1 = await queryPlayerHistory("usr_1", {
				modules: ["STRATEGY"],
				page: 1,
				pageSize: 10,
				status: "COMPLETED",
				vodId: "vod_1",
			});

			// Act 2: With empty options (default branch)
			const result2 = await playthroughService.listHistory("usr_1", {});

			// Act 3: With empty modules array
			const result3 = await playthroughService.listHistory("usr_1", {
				modules: [],
			});

			// Assert
			expect(result1.success).toBe(true);
			if (result1.success) {
				expect(result1.data.total).toBe(1);
				expect(result1.data.items[0]?.accuracy).toBe(50);
				expect(result1.data.items[0]?.medianLatencyMs).toBe(1500);
			}
			expect(result2.success).toBe(true);
			expect(result3.success).toBe(true);
		});

		it("handles database errors (Error and non-Error)", async () => {
			// Arrange
			vi.mocked(getDb)
				.mockRejectedValueOnce(new Error("Query failed"))
				.mockRejectedValueOnce("String error");

			// Act
			const res1 = await playthroughService.listHistory("usr_1");
			const res2 = await playthroughService.listHistory("usr_1");

			// Assert
			expect(res1).toEqual({
				error: "Query failed",
				success: false,
			});
			expect(res2).toEqual({
				error: "Failed to query player history",
				success: false,
			});
		});
	});

	describe("getHistoryDetail", () => {
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
				status: "COMPLETED" as const,
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
			const result = await playthroughService.getHistoryDetail(
				"run_1",
				"player_1",
			);

			// Assert
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data?.id).toBe("run_1");
				expect(result.data?.accuracy).toBe(100);
			}
		});

		it("returns null for not found or test account playthroughs and delegates getPlaythroughHistoryDetail", async () => {
			// Arrange
			const mockDb = {
				query: {
					playthroughs: {
						findFirst: vi
							.fn()
							.mockResolvedValueOnce(null)
							.mockResolvedValueOnce({
								id: "test_run",
								user: { isTestAccount: true },
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

		it("handles database errors (Error and non-Error)", async () => {
			// Arrange
			vi.mocked(getDb)
				.mockRejectedValueOnce(new Error("Detail error"))
				.mockRejectedValueOnce("String error");

			// Act
			const res1 = await playthroughService.getHistoryDetail(
				"run_1",
				"player_1",
			);
			const res2 = await playthroughService.getHistoryDetail(
				"run_1",
				"player_1",
			);

			// Assert
			expect(res1).toEqual({
				error: "Detail error",
				success: false,
			});
			expect(res2).toEqual({
				error: "Failed to retrieve playthrough detail",
				success: false,
			});
		});
	});

	describe("complete", () => {
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
			const result = await playthroughService.complete("pt_1", "usr_1");

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
			const result = await playthroughService.complete("pt_1", "usr_1");

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
			const result = await playthroughService.complete("pt_1", "usr_1");

			// Assert
			expect(result).toEqual({
				data: null,
				success: true,
			});
		});

		it("handles database errors (Error and non-Error)", async () => {
			// Arrange
			const mockDbErr = {
				transaction: vi.fn().mockRejectedValue(new Error("Disk full")),
			};
			const mockDbStr = {
				transaction: vi.fn().mockRejectedValue("Str disk error"),
			};
			vi.mocked(getDb)
				.mockResolvedValueOnce(mockDbErr as never)
				.mockResolvedValueOnce(mockDbStr as never);

			// Act
			const res1 = await playthroughService.complete("pt_1", "usr_1");
			const res2 = await playthroughService.complete("pt_1", "usr_1");

			// Assert
			expect(res1).toEqual({
				error: "Disk full",
				success: false,
			});
			expect(res2).toEqual({
				error: "Failed to complete playthrough",
				success: false,
			});
		});
	});

	describe("recordAttempt", () => {
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
			const result = await playthroughService.recordAttempt({
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
			const result = await playthroughService.recordAttempt({
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
			const result = await playthroughService.recordAttempt({
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
						findFirst: vi.fn().mockResolvedValue(existing),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await playthroughService.recordAttempt({
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

		it("handles database errors (Error and non-Error)", async () => {
			// Arrange
			const mockDbErr = {
				insert: vi.fn().mockReturnValue({
					values: vi.fn().mockReturnValue({
						returning: vi.fn().mockRejectedValue(new Error("D1 offline")),
					}),
				}),
			};
			const mockDbStr = {
				insert: vi.fn().mockReturnValue({
					values: vi.fn().mockReturnValue({
						returning: vi.fn().mockRejectedValue("Str offline"),
					}),
				}),
			};
			vi.mocked(getDb)
				.mockResolvedValueOnce(mockDbErr as never)
				.mockResolvedValueOnce(mockDbStr as never);

			// Act
			const res1 = await playthroughService.recordAttempt({
				idempotencyKey: "idem_1",
				isCorrect: true,
				playthroughId: "pt_1",
				responseTimeMs: 1000,
				scenarioId: "sc_1",
				scenarioSnapshotId: "snap_1",
				userId: "usr_1",
			});
			const res2 = await playthroughService.recordAttempt({
				idempotencyKey: "idem_1",
				isCorrect: true,
				playthroughId: "pt_1",
				responseTimeMs: 1000,
				scenarioId: "sc_1",
				scenarioSnapshotId: "snap_1",
				userId: "usr_1",
			});

			// Assert
			expect(res1).toEqual({
				error: "D1 offline",
				success: false,
			});
			expect(res2).toEqual({
				error: "Failed to record attempt",
				success: false,
			});
		});
	});

	describe("getAttempts and getAttemptByIdempotencyKey", () => {
		it("getAttempts returns list of attempts and handles error", async () => {
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
			const result = await playthroughService.getAttempts("pt_1", "usr_1");

			// Assert
			expect(result).toEqual({
				data: mockAttempts,
				success: true,
			});

			// Error
			vi.mocked(getDb)
				.mockRejectedValueOnce(new Error("Fetch failed"))
				.mockRejectedValueOnce("Str error");

			expect(await playthroughService.getAttempts("pt_1", "usr_1")).toEqual({
				error: "Fetch failed",
				success: false,
			});
			expect(await playthroughService.getAttempts("pt_1", "usr_1")).toEqual({
				error: "Failed to retrieve attempts",
				success: false,
			});
		});

		it("getAttemptByIdempotencyKey returns attempt, null, and handles errors", async () => {
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
			const result = await playthroughService.getAttemptByIdempotencyKey(
				"key_1",
				"usr_1",
			);
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

			// Error
			vi.mocked(getDb)
				.mockRejectedValueOnce(new Error("Key lookup failed"))
				.mockRejectedValueOnce("Str error");

			expect(
				await playthroughService.getAttemptByIdempotencyKey("key_1", "usr_1"),
			).toEqual({ error: "Key lookup failed", success: false });
			expect(
				await playthroughService.getAttemptByIdempotencyKey("key_1", "usr_1"),
			).toEqual({
				error: "Failed to retrieve attempt by key",
				success: false,
			});
		});
	});
});
