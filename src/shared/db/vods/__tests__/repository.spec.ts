import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAuditEntry } from "../../audit/repository";
import { getDb } from "../../client/client";
import {
	bulkDeleteVods,
	bulkPublishVods,
	createScenario,
	createVod,
	deleteScenario,
	deleteVod,
	getAdminVods,
	getPublishedVods,
	getScenarioById,
	getScenariosByVodId,
	getSessionManifest,
	getVodById,
	reorderScenarios,
	setVodPublicationStatus,
	updateScenario,
	updateVod,
} from "../repository";

vi.mock("../../client/client");
vi.mock("../../audit/repository");

describe("vods repository", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("getPublishedVods returns published vods with scenario count", async () => {
		// Arrange
		const mockVods = [
			{ id: "vod_1", isPublished: true, scenarios: [{ id: "sc_1" }] },
		];
		const mockDb = {
			query: {
				vods: {
					findMany: vi.fn().mockImplementation((options) => {
						if (options?.where) {
							options.where({ isPublished: true }, { eq: vi.fn() });
						}
						return Promise.resolve(mockVods);
					}),
				},
			},
		};
		vi.mocked(getDb).mockResolvedValue(mockDb as never);

		// Act
		const result = await getPublishedVods();

		// Assert
		expect(result).toEqual({
			data: mockVods,
			success: true,
		});
	});

	it("getPublishedVods handles database error", async () => {
		// Arrange
		vi.mocked(getDb).mockRejectedValue(new Error("Query failed"));

		// Act
		const result = await getPublishedVods();

		// Assert
		expect(result).toEqual({
			error: "Query failed",
			success: false,
		});
	});

	it("getAdminVods filters by options", async () => {
		// Arrange
		const mockVods = [{ id: "vod_admin", title: "Admin VOD" }];
		const mockDb = {
			query: {
				vods: {
					findMany: vi.fn().mockImplementation((options) => {
						if (options?.where) {
							options.where(
								{
									heroName: "Ana",
									isPublished: false,
									mapName: "Map",
									role: "SUPPORT",
									title: "Title",
								},
								{ and: vi.fn(), eq: vi.fn(), like: vi.fn(), or: vi.fn() },
							);
						}
						return Promise.resolve(mockVods);
					}),
				},
			},
		};
		vi.mocked(getDb).mockResolvedValue(mockDb as never);

		// Act
		const result = await getAdminVods({
			isPublished: false,
			role: "SUPPORT",
			search: "Kings",
		});

		// Assert
		expect(result).toEqual({
			data: mockVods,
			success: true,
		});
	});

	it("getVodById returns vod with scenarios", async () => {
		// Arrange
		const mockVod = {
			id: "vod_1",
			scenarios: [{ id: "sc_1", timestampSeconds: 10 }],
		};
		const mockDb = {
			query: {
				vods: {
					findFirst: vi.fn().mockImplementation((options) => {
						if (options?.with?.scenarios?.orderBy) {
							options.with.scenarios.orderBy({}, { asc: vi.fn() });
						}
						return Promise.resolve(mockVod);
					}),
				},
			},
		};
		vi.mocked(getDb).mockResolvedValue(mockDb as never);

		// Act
		const result = await getVodById("vod_1");

		// Assert
		expect(result).toEqual({
			data: mockVod,
			success: true,
		});
	});

	it("createVod rejects publication on initial creation", async () => {
		// Arrange & Act
		const result = await createVod({
			durationSeconds: 600,
			heroName: "Ana",
			isPublished: true,
			mapName: "Map",
			rankTier: "Diamond",
			role: "SUPPORT",
			title: "Title",
			youtubeVideoId: "yt1",
		});

		// Assert
		expect(result).toEqual({
			error: "Cannot publish a VOD with zero scenarios",
			success: false,
		});
	});

	it("createVod creates vod and writes audit entry", async () => {
		// Arrange
		const mockVod = {
			durationSeconds: 600,
			heroName: "Ana",
			id: "vod_new",
			isPublished: false,
			mapName: "Map",
			rankTier: "Diamond",
			role: "SUPPORT",
			title: "Title",
			youtubeVideoId: "yt1",
		};
		const mockDb = {
			insert: vi.fn().mockReturnValue({
				values: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([mockVod]),
				}),
			}),
		};
		vi.mocked(getDb).mockResolvedValue(mockDb as never);

		// Act
		const result = await createVod({
			actorUserId: "usr_admin",
			durationSeconds: 600,
			heroName: "Ana",
			mapName: "Map",
			rankTier: "Diamond",
			role: "SUPPORT",
			title: "Title",
			youtubeVideoId: "yt1",
		});

		// Assert
		expect(result).toEqual({
			data: mockVod,
			success: true,
		});
		expect(createAuditEntry).toHaveBeenCalled();
	});

	it("updateVod returns error if vod is not found", async () => {
		// Arrange
		const mockDb = {
			query: {
				vods: {
					findFirst: vi.fn().mockResolvedValue(null),
				},
			},
		};
		vi.mocked(getDb).mockResolvedValue(mockDb as never);

		// Act
		const result = await updateVod({ id: "missing_vod", title: "New Title" });

		// Assert
		expect(result).toEqual({
			error: "VOD not found",
			success: false,
		});
	});

	it("updateVod updates fields and records audit entry", async () => {
		// Arrange
		const existing = {
			durationSeconds: 600,
			heroName: "Ana",
			id: "vod_1",
			isPublished: false,
			mapName: "Map",
			rankTier: "Diamond",
			role: "SUPPORT",
			scenarios: [
				{
					explanationText: "E",
					id: "s1",
					imageUrl: null,
					inputConfig: {
						options: [
							{ id: "1", is_correct: true, text: "O1" },
							{ id: "2", is_correct: false, text: "O2" },
						],
					},
					inputType: "MULTIPLE_CHOICE" as const,
					moduleType: "STRATEGY" as const,
					promptText: "P",
					timeLimitSeconds: null,
					timestampSeconds: 50,
					vodId: "vod_1",
				},
			],
			title: "Old Title",
			youtubeVideoId: "yt1",
		};
		const updated = { ...existing, isPublished: true, title: "New Title" };
		const mockDb = {
			query: {
				vods: {
					findFirst: vi.fn().mockResolvedValue(existing),
				},
			},
			update: vi.fn().mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([updated]),
					}),
				}),
			}),
		};
		vi.mocked(getDb).mockResolvedValue(mockDb as never);

		// Act
		const result = await updateVod({
			actorUserId: "usr_1",
			id: "vod_1",
			isPublished: true,
			title: "New Title",
		});

		// Assert
		expect(result).toEqual({
			data: updated,
			success: true,
		});
		expect(createAuditEntry).toHaveBeenCalled();
	});

	it("deleteVod deletes existing vod and creates audit entry", async () => {
		// Arrange
		const existing = {
			durationSeconds: 600,
			heroName: "Ana",
			id: "vod_del",
			mapName: "Map",
			role: "SUPPORT",
			scenarios: [],
			title: "Delete Me",
		};
		const mockDb = {
			delete: vi.fn().mockReturnValue({
				where: vi.fn().mockResolvedValue([]),
			}),
			query: {
				vods: {
					findFirst: vi.fn().mockResolvedValue(existing),
				},
			},
		};
		vi.mocked(getDb).mockResolvedValue(mockDb as never);

		// Act
		const result = await deleteVod({ actorUserId: "usr_admin", id: "vod_del" });

		// Assert
		expect(result).toEqual({
			data: undefined,
			success: true,
		});
		expect(createAuditEntry).toHaveBeenCalled();
	});

	it("bulkPublishVods and bulkDeleteVods process items correctly", async () => {
		// Arrange
		const existing = {
			durationSeconds: 600,
			id: "vod_1",
			isPublished: false,
			scenarios: [
				{
					explanationText: "E",
					id: "s1",
					imageUrl: null,
					inputConfig: {
						options: [
							{ id: "1", is_correct: true, text: "O1" },
							{ id: "2", is_correct: false, text: "O2" },
						],
					},
					inputType: "MULTIPLE_CHOICE" as const,
					moduleType: "STRATEGY" as const,
					promptText: "P",
					timeLimitSeconds: null,
					timestampSeconds: 50,
					vodId: "vod_1",
				},
			],
		};
		const mockDb = {
			delete: vi.fn().mockReturnValue({
				where: vi.fn().mockResolvedValue([]),
			}),
			query: {
				vods: {
					findFirst: vi.fn().mockResolvedValue(existing),
				},
			},
			update: vi.fn().mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([existing]),
					}),
				}),
			}),
		};
		vi.mocked(getDb).mockResolvedValue(mockDb as never);

		// Act
		const pubResult = await bulkPublishVods({
			ids: ["vod_1"],
			isPublished: true,
		});
		const delResult = await bulkDeleteVods({ ids: ["vod_1"] });

		// Assert
		expect(pubResult.success).toBe(true);
		expect(delResult.success).toBe(true);
	});

	it("createScenario validates input and inserts scenario", async () => {
		// Arrange
		const mockVod = { durationSeconds: 600, id: "vod_1", scenarios: [] };
		const mockScenario = {
			explanationText: "E",
			id: "sc_1",
			imageUrl: null,
			inputConfig: {
				options: [
					{ id: "1", is_correct: true, text: "O1" },
					{ id: "2", is_correct: false, text: "O2" },
				],
			},
			inputType: "MULTIPLE_CHOICE" as const,
			moduleType: "STRATEGY" as const,
			promptText: "P",
			timeLimitSeconds: null,
			timestampSeconds: 120,
			vodId: "vod_1",
		};
		const mockDb = {
			insert: vi.fn().mockReturnValue({
				values: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([mockScenario]),
				}),
			}),
			query: {
				vods: {
					findFirst: vi.fn().mockResolvedValue(mockVod),
				},
			},
		};
		vi.mocked(getDb).mockResolvedValue(mockDb as never);

		// Act
		const result = await createScenario({
			explanationText: "E",
			inputConfig: mockScenario.inputConfig,
			inputType: "MULTIPLE_CHOICE",
			moduleType: "STRATEGY",
			promptText: "P",
			timestampSeconds: 120,
			vodId: "vod_1",
		});

		// Assert
		expect(result).toEqual({
			data: mockScenario,
			success: true,
		});
	});

	it("updateScenario updates scenario and records audit", async () => {
		// Arrange
		const existingScenario = {
			explanationText: "E",
			id: "sc_1",
			imageUrl: null,
			inputConfig: {
				options: [
					{ id: "1", is_correct: true, text: "O1" },
					{ id: "2", is_correct: false, text: "O2" },
				],
			},
			inputType: "MULTIPLE_CHOICE" as const,
			moduleType: "STRATEGY" as const,
			promptText: "P",
			timeLimitSeconds: null,
			timestampSeconds: 100,
			vodId: "vod_1",
		};
		const updatedScenario = { ...existingScenario, promptText: "New P" };
		const mockDb = {
			query: {
				scenarios: {
					findFirst: vi.fn().mockResolvedValue(existingScenario),
				},
			},
			update: vi.fn().mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([updatedScenario]),
					}),
				}),
			}),
		};
		vi.mocked(getDb).mockResolvedValue(mockDb as never);

		// Act
		const result = await updateScenario({ id: "sc_1", promptText: "New P" });

		// Assert
		expect(result).toEqual({
			data: updatedScenario,
			success: true,
		});
	});

	it("deleteScenario deletes scenario and creates audit", async () => {
		// Arrange
		const existingScenario = {
			explanationText: "E",
			id: "sc_1",
			moduleType: "STRATEGY" as const,
			promptText: "P",
			timestampSeconds: 50,
			vodId: "vod_1",
		};
		const mockDb = {
			delete: vi.fn().mockReturnValue({
				where: vi.fn().mockResolvedValue([]),
			}),
			query: {
				scenarios: {
					findFirst: vi.fn().mockResolvedValue(existingScenario),
				},
			},
		};
		vi.mocked(getDb).mockResolvedValue(mockDb as never);

		// Act
		const result = await deleteScenario({ id: "sc_1" });

		// Assert
		expect(result).toEqual({
			data: undefined,
			success: true,
		});
	});

	it("reorderScenarios updates scenario timestamps in batch", async () => {
		// Arrange
		const mockVod = {
			id: "vod_1",
			scenarios: [{ id: "sc_1" }, { id: "sc_2" }],
		};
		const mockDb = {
			query: {
				vods: {
					findFirst: vi.fn().mockResolvedValue(mockVod),
				},
			},
			update: vi.fn().mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue([]),
				}),
			}),
		};
		vi.mocked(getDb).mockResolvedValue(mockDb as never);

		// Act
		const result = await reorderScenarios({
			scenarioOrders: [
				{ id: "sc_1", timestampSeconds: 20 },
				{ id: "sc_2", timestampSeconds: 40 },
			],
			vodId: "vod_1",
		});

		// Assert
		expect(result).toEqual({
			data: undefined,
			success: true,
		});
	});

	it("getSessionManifest queries vod and orders scenarios by timestamp", async () => {
		// Arrange
		const mockManifest = {
			id: "vod_1",
			scenarios: [{ id: "sc_1", timestampSeconds: 10 }],
		};
		const mockDb = {
			query: {
				vods: {
					findFirst: vi.fn().mockImplementation((options) => {
						if (options?.where) {
							options.where(
								{ id: "vod_1", isPublished: true },
								{ and: vi.fn(), eq: vi.fn() },
							);
						}
						if (options?.with?.scenarios?.orderBy) {
							options.with.scenarios.orderBy({}, { asc: vi.fn() });
						}
						return Promise.resolve(mockManifest);
					}),
				},
			},
		};
		vi.mocked(getDb).mockResolvedValue(mockDb as never);

		// Act
		const result = await getSessionManifest("vod_1");

		// Assert
		expect(result).toEqual({
			data: mockManifest,
			success: true,
		});
	});
});
