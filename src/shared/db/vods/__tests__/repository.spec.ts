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

	describe("getPublishedVods", () => {
		it("returns published vods with scenario count", async () => {
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

		it("handles database error", async () => {
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
	});

	describe("getAdminVods", () => {
		it("filters by options (role, search, isPublished)", async () => {
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
				search: "Ana",
			});

			// Assert
			expect(result).toEqual({
				data: mockVods,
				success: true,
			});
		});

		it("handles undefined options", async () => {
			// Arrange
			const mockDb = {
				query: {
					vods: {
						findMany: vi.fn().mockImplementation((options) => {
							if (options?.where) {
								options.where(
									{},
									{ and: vi.fn(), eq: vi.fn(), like: vi.fn(), or: vi.fn() },
								);
							}
							return Promise.resolve([]);
						}),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await getAdminVods();

			// Assert
			expect(result).toEqual({
				data: [],
				success: true,
			});
		});

		it("handles database error", async () => {
			// Arrange
			vi.mocked(getDb).mockRejectedValue(new Error("D1 query failure"));

			// Act
			const result = await getAdminVods();

			// Assert
			expect(result).toEqual({
				error: "D1 query failure",
				success: false,
			});
		});
	});

	describe("getVodById", () => {
		it("returns vod with scenarios ordered by timestamp", async () => {
			// Arrange
			const mockVod = {
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
							return Promise.resolve(mockVod);
						}),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await getVodById("vod_1", { publishedOnly: true });

			// Assert
			expect(result).toEqual({
				data: mockVod,
				success: true,
			});
		});

		it("returns null data when vod not found", async () => {
			// Arrange
			const mockDb = {
				query: {
					vods: {
						findFirst: vi.fn().mockImplementation((options) => {
							if (options?.where) {
								options.where(
									{ id: "vod_missing" },
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
			const result = await getVodById("vod_missing", { publishedOnly: false });

			// Assert
			expect(result).toEqual({
				data: null,
				success: true,
			});
		});

		it("handles database error", async () => {
			// Arrange
			vi.mocked(getDb).mockRejectedValue(new Error("Lookup failed"));

			// Act
			const result = await getVodById("vod_1");

			// Assert
			expect(result).toEqual({
				error: "Lookup failed",
				success: false,
			});
		});
	});

	describe("getScenariosByVodId and getScenarioById", () => {
		it("getScenariosByVodId returns scenarios filtered by moduleTypes", async () => {
			// Arrange
			const mockScenarios = [{ id: "sc_1", moduleType: "STRATEGY" }];
			const mockDb = {
				query: {
					scenarios: {
						findMany: vi.fn().mockImplementation((options) => {
							if (options?.where) {
								options.where(
									{ moduleType: "STRATEGY", vodId: "vod_1" },
									{ and: vi.fn(), eq: vi.fn(), inArray: vi.fn() },
								);
							}
							if (options?.orderBy) {
								options.orderBy({}, { asc: vi.fn() });
							}
							return Promise.resolve(mockScenarios);
						}),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await getScenariosByVodId("vod_1");

			// Assert
			expect(result).toEqual({
				data: mockScenarios,
				success: true,
			});
		});

		it("getScenariosByVodId handles empty modules and database errors", async () => {
			// Arrange
			const mockDb = {
				query: {
					scenarios: {
						findMany: vi.fn().mockImplementation((options) => {
							if (options?.where) {
								options.where({ vodId: "vod_1" }, { eq: vi.fn() });
							}
							return Promise.resolve([]);
						}),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await getScenariosByVodId("vod_1");

			// Assert
			expect(result).toEqual({
				data: [],
				success: true,
			});
		});

		it("getScenariosByVodId handles database errors", async () => {
			// Arrange
			vi.mocked(getDb).mockRejectedValue(new Error("Scenarios error"));

			// Act
			const result = await getScenariosByVodId("vod_1");

			// Assert
			expect(result).toEqual({
				error: "Scenarios error",
				success: false,
			});
		});

		it("getScenarioById returns scenario or null", async () => {
			// Arrange
			const mockScenario = { id: "sc_1", promptText: "Prompt" };
			const mockDb = {
				query: {
					scenarios: {
						findFirst: vi.fn().mockImplementation((options) => {
							if (options?.where) {
								options.where({ id: "sc_1" }, { eq: vi.fn() });
							}
							return Promise.resolve(mockScenario);
						}),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await getScenarioById("sc_1");

			// Assert
			expect(result).toEqual({
				data: mockScenario,
				success: true,
			});
		});

		it("getScenarioById handles query errors", async () => {
			// Arrange
			vi.mocked(getDb).mockRejectedValue(new Error("Scenario lookup failed"));

			// Act
			const result = await getScenarioById("sc_1");

			// Assert
			expect(result).toEqual({
				error: "Scenario lookup failed",
				success: false,
			});
		});
	});

	describe("createVod, updateVod, deleteVod, and setVodPublicationStatus", () => {
		it("createVod validates input and prevents publishing with 0 scenarios", async () => {
			// Act: invalid input
			const resInvalid = await createVod({
				durationSeconds: -5,
				heroName: "",
				mapName: "",
				rankTier: "",
				role: "SUPPORT",
				title: "",
				youtubeVideoId: "",
			});
			expect(resInvalid.success).toBe(false);

			// Act: publish with 0 scenarios
			const resPublish = await createVod({
				durationSeconds: 600,
				heroName: "Ana",
				isPublished: true,
				mapName: "Map",
				rankTier: "Grandmaster",
				role: "SUPPORT",
				title: "Title",
				youtubeVideoId: "yt1",
			});
			expect(resPublish).toEqual({
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

		it("createVod handles empty returning array and db error", async () => {
			// Act 1: empty returning
			const mockDbEmpty = {
				insert: vi.fn().mockReturnValue({
					values: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([]),
					}),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDbEmpty as never);
			const resEmpty = await createVod({
				durationSeconds: 600,
				heroName: "Ana",
				mapName: "Map",
				rankTier: "Diamond",
				role: "SUPPORT",
				title: "Title",
				youtubeVideoId: "yt1",
			});
			expect(resEmpty).toEqual({
				error: "Failed to create VOD",
				success: false,
			});

			// Act 2: db error
			const mockDbError = {
				insert: vi.fn().mockReturnValue({
					values: vi.fn().mockReturnValue({
						returning: vi.fn().mockRejectedValue(new Error("Insert error")),
					}),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDbError as never);
			const resError = await createVod({
				durationSeconds: 600,
				heroName: "Ana",
				mapName: "Map",
				rankTier: "Diamond",
				role: "SUPPORT",
				title: "Title",
				youtubeVideoId: "yt1",
			});
			expect(resError).toEqual({
				error: "Insert error",
				success: false,
			});
		});

		it("updateVod validates input and returns error if vod not found", async () => {
			// Act: invalid input
			const resInvalid = await updateVod({ durationSeconds: -10, id: "v1" });
			expect(resInvalid.success).toBe(false);

			// Arrange: not found
			const mockDb = {
				query: {
					vods: {
						findFirst: vi.fn().mockImplementation((options) => {
							if (options?.where)
								options.where({ id: "missing_vod" }, { eq: vi.fn() });
							return Promise.resolve(null);
						}),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const resNotFound = await updateVod({
				id: "missing_vod",
				title: "New Title",
			});

			// Assert
			expect(resNotFound).toEqual({
				error: "VOD not found",
				success: false,
			});
		});

		it("updateVod prevents publishing if scenarios are invalid", async () => {
			// Arrange
			const existing = {
				durationSeconds: 600,
				heroName: "Ana",
				id: "vod_1",
				isPublished: false,
				mapName: "Map",
				rankTier: "Diamond",
				role: "SUPPORT",
				scenarios: [],
				title: "Title",
				youtubeVideoId: "yt1",
			};
			const mockDb = {
				query: {
					vods: {
						findFirst: vi.fn().mockImplementation((options) => {
							if (options?.where)
								options.where({ id: "vod_1" }, { eq: vi.fn() });
							return Promise.resolve(existing);
						}),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await updateVod({ id: "vod_1", isPublished: true });

			// Assert
			expect(result).toEqual({
				error: "Cannot publish a VOD with zero scenarios",
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
				title: "Title",
				youtubeVideoId: "yt1",
			};
			const updated = { ...existing, title: "Updated Title" };
			const mockDb = {
				query: {
					vods: {
						findFirst: vi.fn().mockImplementation((options) => {
							if (options?.where)
								options.where({ id: "vod_1" }, { eq: vi.fn() });
							return Promise.resolve(existing);
						}),
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
				actorUserId: "usr_admin",
				durationSeconds: 700,
				heroName: "Ana Updated",
				id: "vod_1",
				isPublished: true,
				mapName: "New Map",
				rankTier: "Grandmaster",
				role: "SUPPORT",
				title: "Updated Title",
				youtubeVideoId: "yt2",
			});

			// Assert
			expect(result).toEqual({
				data: updated,
				success: true,
			});
			expect(createAuditEntry).toHaveBeenCalled();
		});

		it("updateVod records audit when unpublishing a published VOD", async () => {
			// Arrange
			const existingPublished = {
				durationSeconds: 600,
				heroName: "Ana",
				id: "vod_pub",
				isPublished: true,
				mapName: "Map",
				rankTier: "Diamond",
				role: "SUPPORT",
				scenarios: [],
				title: "Title",
				youtubeVideoId: "yt1",
			};
			const updatedUnpublished = { ...existingPublished, isPublished: false };
			const mockDb = {
				query: {
					vods: {
						findFirst: vi.fn().mockResolvedValue(existingPublished),
					},
				},
				update: vi.fn().mockReturnValue({
					set: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							returning: vi.fn().mockResolvedValue([updatedUnpublished]),
						}),
					}),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await updateVod({
				actorUserId: "usr_admin",
				id: "vod_pub",
				isPublished: false,
			});

			// Assert
			expect(result).toEqual({
				data: updatedUnpublished,
				success: true,
			});
			expect(createAuditEntry).toHaveBeenCalledWith(
				expect.objectContaining({ action: "VOD_UNPUBLISHED" }),
				undefined,
			);
		});

		it("updateVod handles updating with unchanged isPublished status", async () => {
			// Arrange
			const existingDraft = {
				durationSeconds: 600,
				heroName: "Ana",
				id: "vod_draft",
				isPublished: false,
				mapName: "Map",
				rankTier: "Diamond",
				role: "SUPPORT",
				scenarios: [],
				title: "Title",
				youtubeVideoId: "yt1",
			};
			const updatedDraft = { ...existingDraft, title: "New Title" };
			const mockDb = {
				query: {
					vods: {
						findFirst: vi.fn().mockResolvedValue(existingDraft),
					},
				},
				update: vi.fn().mockReturnValue({
					set: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							returning: vi.fn().mockResolvedValue([updatedDraft]),
						}),
					}),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await updateVod({
				actorUserId: "usr_admin",
				id: "vod_draft",
				isPublished: false,
				title: "New Title",
			});

			// Assert
			expect(result).toEqual({
				data: updatedDraft,
				success: true,
			});
			expect(createAuditEntry).toHaveBeenCalledWith(
				expect.objectContaining({ action: "VOD_UPDATED" }),
				undefined,
			);
		});

		it("updateVod handles empty returning array and db error", async () => {
			// Arrange
			const existing = {
				durationSeconds: 600,
				heroName: "Ana",
				id: "vod_1",
				isPublished: false,
				mapName: "Map",
				rankTier: "Diamond",
				role: "SUPPORT",
				scenarios: [],
				title: "Title",
				youtubeVideoId: "yt1",
			};
			const mockDbEmpty = {
				query: {
					vods: {
						findFirst: vi.fn().mockResolvedValue(existing),
					},
				},
				update: vi.fn().mockReturnValue({
					set: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							returning: vi.fn().mockResolvedValue([]),
						}),
					}),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDbEmpty as never);

			// Act 1: empty returning
			const resEmpty = await updateVod({ id: "vod_1", title: "New" });
			expect(resEmpty).toEqual({
				error: "Failed to update VOD",
				success: false,
			});

			// Act 2: db error
			const mockDbError = {
				query: {
					vods: {
						findFirst: vi.fn().mockResolvedValue(existing),
					},
				},
				update: vi.fn().mockReturnValue({
					set: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							returning: vi.fn().mockRejectedValue(new Error("Update fail")),
						}),
					}),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDbError as never);
			const resError = await updateVod({ id: "vod_1", title: "New" });
			expect(resError).toEqual({
				error: "Update fail",
				success: false,
			});
		});

		it("deleteVod deletes vod and records audit entry", async () => {
			// Arrange
			const existing = { id: "vod_1", title: "GM VOD" };
			const mockDb = {
				delete: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue(undefined),
				}),
				query: {
					vods: {
						findFirst: vi.fn().mockImplementation((options) => {
							if (options?.where)
								options.where({ id: "vod_1" }, { eq: vi.fn() });
							return Promise.resolve(existing);
						}),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await deleteVod({ actorUserId: "admin_1", id: "vod_1" });

			// Assert
			expect(result).toEqual({
				data: undefined,
				success: true,
			});
			expect(createAuditEntry).toHaveBeenCalled();
		});

		it("deleteVod returns error if vod not found or on lookup / delete error", async () => {
			// Arrange
			const mockDb = {
				query: {
					vods: {
						findFirst: vi.fn().mockImplementation((options) => {
							if (options?.where)
								options.where({ id: "missing" }, { eq: vi.fn() });
							return Promise.resolve(null);
						}),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act 1: not found
			const resNotFound = await deleteVod({ id: "missing" });
			expect(resNotFound).toEqual({
				error: "VOD not found",
				success: false,
			});

			// Act 2: lookup fail
			vi.mocked(getDb).mockRejectedValueOnce(new Error("Lookup fail"));
			const resLookupFail = await deleteVod({ id: "v1" });
			expect(resLookupFail).toEqual({
				error: "Lookup fail",
				success: false,
			});

			// Act 3: delete fail
			const existing = { id: "vod_1", title: "GM VOD" };
			const mockDbDeleteError = {
				delete: vi.fn().mockReturnValue({
					where: vi.fn().mockRejectedValue(new Error("Delete fail")),
				}),
				query: {
					vods: {
						findFirst: vi.fn().mockResolvedValue(existing),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDbDeleteError as never);
			const resDeleteError = await deleteVod({ id: "vod_1" });
			expect(resDeleteError).toEqual({
				error: "Delete fail",
				success: false,
			});
		});

		it("setVodPublicationStatus updates publication status with validation", async () => {
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
			const updated = { ...existing, isPublished: true };
			const mockDb = {
				query: {
					vods: {
						findFirst: vi.fn().mockImplementation((options) => {
							if (options?.where)
								options.where({ id: "vod_1" }, { eq: vi.fn() });
							return Promise.resolve(existing);
						}),
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
			const result = await setVodPublicationStatus({
				actorUserId: "admin_1",
				id: "vod_1",
				isPublished: true,
			});

			// Assert
			expect(result).toEqual({
				data: updated,
				success: true,
			});
		});
	});

	describe("bulkPublishVods and bulkDeleteVods", () => {
		it("bulkPublishVods validates and executes bulk publication", async () => {
			// Arrange
			const existingVod = {
				durationSeconds: 600,
				id: "v1",
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
						vodId: "v1",
					},
				],
			};
			const mockDb = {
				query: {
					vods: {
						findFirst: vi
							.fn()
							.mockImplementationOnce((options) => {
								if (options?.where)
									options.where({ id: "v1" }, { eq: vi.fn() });
								return Promise.resolve(existingVod);
							})
							.mockImplementationOnce((options) => {
								if (options?.where)
									options.where({ id: "v_missing" }, { eq: vi.fn() });
								return Promise.resolve(null);
							}),
					},
				},
				update: vi.fn().mockReturnValue({
					set: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							returning: vi
								.fn()
								.mockResolvedValue([{ ...existingVod, isPublished: true }]),
						}),
					}),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await bulkPublishVods({
				actorUserId: "admin_1",
				ids: ["v1", "v_missing"],
				isPublished: true,
			});

			// Assert
			expect(result).toEqual({
				data: {
					failed: [{ error: "VOD not found", id: "v_missing" }],
					succeeded: ["v1"],
				},
				success: true,
			});
		});

		it("bulkDeleteVods deletes multiple vods and records individual outcomes", async () => {
			// Arrange
			const existingVod = { id: "v1", title: "VOD 1" };
			const mockDb = {
				delete: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue(undefined),
				}),
				query: {
					vods: {
						findFirst: vi
							.fn()
							.mockImplementationOnce((options) => {
								if (options?.where)
									options.where({ id: "v1" }, { eq: vi.fn() });
								return Promise.resolve(existingVod);
							})
							.mockImplementationOnce((options) => {
								if (options?.where)
									options.where({ id: "v_missing" }, { eq: vi.fn() });
								return Promise.resolve(null);
							}),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await bulkDeleteVods({
				actorUserId: "admin_1",
				ids: ["v1", "v_missing"],
			});

			// Assert
			expect(result).toEqual({
				data: {
					failed: [{ error: "VOD not found", id: "v_missing" }],
					succeeded: ["v1"],
				},
				success: true,
			});
		});
	});

	describe("scenario management", () => {
		it("createScenario validates config and creates scenario", async () => {
			// Arrange
			const existingVod = { id: "vod_1" };
			const mockScenario = {
				explanationText: "E",
				id: "s_new",
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
			};
			const mockDb = {
				insert: vi.fn().mockReturnValue({
					values: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([mockScenario]),
					}),
				}),
				query: {
					vods: {
						findFirst: vi.fn().mockImplementation((options) => {
							if (options?.where)
								options.where({ id: "vod_1" }, { eq: vi.fn() });
							return Promise.resolve(existingVod);
						}),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await createScenario({
				actorUserId: "admin_1",
				explanationText: "E",
				inputConfig: {
					options: [
						{ id: "1", is_correct: true, text: "O1" },
						{ id: "2", is_correct: false, text: "O2" },
					],
				},
				inputType: "MULTIPLE_CHOICE",
				moduleType: "STRATEGY",
				promptText: "P",
				timestampSeconds: 50,
				vodId: "vod_1",
			});

			// Assert
			expect(result).toEqual({
				data: mockScenario,
				success: true,
			});
			expect(createAuditEntry).toHaveBeenCalled();
		});

		it("createScenario returns error when VOD is not found", async () => {
			// Arrange
			const mockDb = {
				query: {
					vods: {
						findFirst: vi.fn().mockImplementation((options) => {
							if (options?.where)
								options.where({ id: "vod_missing" }, { eq: vi.fn() });
							return Promise.resolve(null);
						}),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await createScenario({
				explanationText: "E",
				inputConfig: {
					options: [
						{ id: "1", is_correct: true, text: "O1" },
						{ id: "2", is_correct: false, text: "O2" },
					],
				},
				inputType: "MULTIPLE_CHOICE",
				moduleType: "STRATEGY",
				promptText: "P",
				timestampSeconds: 50,
				vodId: "vod_missing",
			});

			// Assert
			expect(result).toEqual({
				error: "VOD not found",
				success: false,
			});
		});

		it("createScenario handles validation error, vod lookup failure, and timestamp exceeding duration", async () => {
			// Act 1: validation error (empty prompt)
			const resValidation = await createScenario({
				explanationText: "E",
				inputConfig: {
					options: [
						{ id: "1", is_correct: true, text: "O1" },
						{ id: "2", is_correct: false, text: "O2" },
					],
				},
				inputType: "MULTIPLE_CHOICE",
				moduleType: "STRATEGY",
				promptText: "",
				timestampSeconds: 50,
				vodId: "vod_1",
			});
			expect(resValidation.success ? null : resValidation.error).toContain(
				"Scenario prompt text is required",
			);

			// Act 2: vod lookup failure
			vi.mocked(getDb).mockRejectedValueOnce(new Error("Lookup failure"));
			const resLookupFail = await createScenario({
				explanationText: "E",
				inputConfig: {
					options: [
						{ id: "1", is_correct: true, text: "O1" },
						{ id: "2", is_correct: false, text: "O2" },
					],
				},
				inputType: "MULTIPLE_CHOICE",
				moduleType: "STRATEGY",
				promptText: "P",
				timestampSeconds: 50,
				vodId: "vod_1",
			});
			expect(resLookupFail).toEqual({
				error: "Lookup failure",
				success: false,
			});

			// Act 3: timestamp exceeds duration
			const mockVodShort = { durationSeconds: 30, id: "vod_1", scenarios: [] };
			const mockDbShort = {
				query: {
					vods: {
						findFirst: vi.fn().mockResolvedValue(mockVodShort),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDbShort as never);
			const resExceeds = await createScenario({
				explanationText: "E",
				inputConfig: {
					options: [
						{ id: "1", is_correct: true, text: "O1" },
						{ id: "2", is_correct: false, text: "O2" },
					],
				},
				inputType: "MULTIPLE_CHOICE",
				moduleType: "STRATEGY",
				promptText: "P",
				timestampSeconds: 50,
				vodId: "vod_1",
			});
			expect(resExceeds.success ? null : resExceeds.error).toContain(
				"exceeds VOD duration",
			);
		});

		it("createScenario handles empty returning array and db errors", async () => {
			// Act 1: empty returning
			const mockDbEmpty = {
				insert: vi.fn().mockReturnValue({
					values: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([]),
					}),
				}),
				query: {
					vods: {
						findFirst: vi.fn().mockResolvedValue({
							durationSeconds: 600,
							id: "vod_1",
							scenarios: [],
						}),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDbEmpty as never);
			const resEmpty = await createScenario({
				explanationText: "E",
				inputConfig: {
					options: [
						{ id: "1", is_correct: true, text: "O1" },
						{ id: "2", is_correct: false, text: "O2" },
					],
				},
				inputType: "MULTIPLE_CHOICE",
				moduleType: "STRATEGY",
				promptText: "P",
				timestampSeconds: 50,
				vodId: "vod_1",
			});
			expect(resEmpty).toEqual({
				error: "Failed to create scenario",
				success: false,
			});

			// Act 2: db error
			const mockDbError = {
				insert: vi.fn().mockReturnValue({
					values: vi.fn().mockReturnValue({
						returning: vi.fn().mockRejectedValue(new Error("Insert error")),
					}),
				}),
				query: {
					vods: {
						findFirst: vi.fn().mockResolvedValue({
							durationSeconds: 600,
							id: "vod_1",
							scenarios: [],
						}),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDbError as never);
			const resError = await createScenario({
				explanationText: "E",
				inputConfig: {
					options: [
						{ id: "1", is_correct: true, text: "O1" },
						{ id: "2", is_correct: false, text: "O2" },
					],
				},
				inputType: "MULTIPLE_CHOICE",
				moduleType: "STRATEGY",
				promptText: "P",
				timestampSeconds: 50,
				vodId: "vod_1",
			});
			expect(resError).toEqual({
				error: "Insert error",
				success: false,
			});
		});

		it("updateScenario updates scenario fields and records audit", async () => {
			// Arrange
			const existing = {
				explanationText: "Old Exp",
				id: "s1",
				imageUrl: null,
				inputConfig: {
					options: [
						{ id: "1", is_correct: true, text: "A" },
						{ id: "2", is_correct: false, text: "B" },
					],
				},
				inputType: "MULTIPLE_CHOICE" as const,
				moduleType: "STRATEGY" as const,
				promptText: "Old Prompt",
				timeLimitSeconds: null,
				timestampSeconds: 10,
				vodId: "v1",
			};
			const updated = { ...existing, promptText: "New Prompt" };
			const mockDb = {
				query: {
					scenarios: {
						findFirst: vi.fn().mockImplementation((options) => {
							if (options?.where) options.where({ id: "s1" }, { eq: vi.fn() });
							return Promise.resolve(existing);
						}),
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
			const result = await updateScenario({
				actorUserId: "admin_1",
				explanationText: "New Exp",
				id: "s1",
				imageUrl: "img.png",
				inputConfig: {
					options: [
						{ id: "1", is_correct: true, text: "A" },
						{ id: "2", is_correct: false, text: "B" },
					],
				},
				inputType: "MULTIPLE_CHOICE",
				moduleType: "STRATEGY",
				promptText: "New Prompt",
				timeLimitSeconds: 10,
				timestampSeconds: 20,
			});

			// Assert
			expect(result).toEqual({
				data: updated,
				success: true,
			});
			expect(createAuditEntry).toHaveBeenCalled();
		});

		it("updateScenario updates individual fields", async () => {
			// Arrange
			const existing = {
				explanationText: "Exp",
				id: "s1",
				imageUrl: null,
				inputConfig: {
					options: [
						{ id: "1", is_correct: true, text: "A" },
						{ id: "2", is_correct: false, text: "B" },
					],
				},
				inputType: "MULTIPLE_CHOICE" as const,
				moduleType: "STRATEGY" as const,
				promptText: "Prompt",
				timeLimitSeconds: null,
				timestampSeconds: 10,
				vodId: "v1",
			};
			const mockDb = {
				query: {
					scenarios: {
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

			// Act & Assert
			expect(
				await updateScenario({ explanationText: "New", id: "s1" }),
			).toEqual({
				data: existing,
				success: true,
			});
			expect(await updateScenario({ id: "s1", timestampSeconds: 20 })).toEqual({
				data: existing,
				success: true,
			});
			expect(
				await updateScenario({ id: "s1", moduleType: "COOLDOWN" }),
			).toEqual({
				data: existing,
				success: true,
			});
			expect(
				await updateScenario({ id: "s1", inputType: "MULTIPLE_CHOICE" }),
			).toEqual({
				data: existing,
				success: true,
			});
			expect(
				await updateScenario({
					id: "s1",
					inputConfig: {
						options: [
							{ id: "1", is_correct: true, text: "A" },
							{ id: "2", is_correct: false, text: "B" },
						],
					},
				}),
			).toEqual({
				data: existing,
				success: true,
			});
			expect(await updateScenario({ id: "s1", imageUrl: "img.png" })).toEqual({
				data: existing,
				success: true,
			});
			expect(await updateScenario({ id: "s1", timeLimitSeconds: 15 })).toEqual({
				data: existing,
				success: true,
			});
		});

		it("updateScenario handles invalid input, not found, and db error", async () => {
			// Act 1: invalid input
			const resInvalid = await updateScenario({
				id: "s1",
				timestampSeconds: -10,
			});
			expect(resInvalid.success).toBe(false);

			// Act 2: not found
			const mockDbNotFound = {
				query: {
					scenarios: {
						findFirst: vi.fn().mockResolvedValue(null),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDbNotFound as never);
			const resNotFound = await updateScenario({ id: "missing" });
			expect(resNotFound).toEqual({
				error: "Scenario not found",
				success: false,
			});

			// Act 3: update error
			const existing = {
				explanationText: "Old",
				id: "s1",
				inputConfig: {
					options: [
						{ id: "1", is_correct: true, text: "A" },
						{ id: "2", is_correct: false, text: "B" },
					],
				},
				inputType: "MULTIPLE_CHOICE" as const,
				moduleType: "STRATEGY" as const,
				promptText: "P",
				timestampSeconds: 10,
				vodId: "v1",
			};
			const mockDbError = {
				query: {
					scenarios: {
						findFirst: vi.fn().mockResolvedValue(existing),
					},
				},
				update: vi.fn().mockReturnValue({
					set: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							returning: vi.fn().mockRejectedValue(new Error("Write error")),
						}),
					}),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDbError as never);
			const resError = await updateScenario({ id: "s1", promptText: "New" });
			expect(resError).toEqual({
				error: "Write error",
				success: false,
			});

			// Act 4: lookup failure
			vi.mocked(getDb).mockRejectedValueOnce(new Error("Lookup failure"));
			const resLookupFail = await updateScenario({
				id: "s1",
				promptText: "New",
			});
			expect(resLookupFail).toEqual({
				error: "Lookup failure",
				success: false,
			});

			// Act 5: empty returning array
			const mockDbEmptyReturning = {
				query: {
					scenarios: {
						findFirst: vi.fn().mockResolvedValue(existing),
					},
				},
				update: vi.fn().mockReturnValue({
					set: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							returning: vi.fn().mockResolvedValue([]),
						}),
					}),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDbEmptyReturning as never);
			const resEmpty = await updateScenario({ id: "s1", promptText: "New" });
			expect(resEmpty).toEqual({
				error: "Failed to update scenario",
				success: false,
			});
		});

		it("deleteScenario deletes scenario and records audit", async () => {
			// Arrange
			const existing = { id: "s1", vodId: "v1" };
			const mockDb = {
				delete: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue(undefined),
				}),
				query: {
					scenarios: {
						findFirst: vi.fn().mockImplementation((options) => {
							if (options?.where) options.where({ id: "s1" }, { eq: vi.fn() });
							return Promise.resolve(existing);
						}),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await deleteScenario({ actorUserId: "admin_1", id: "s1" });

			// Assert
			expect(result).toEqual({
				data: undefined,
				success: true,
			});
			expect(createAuditEntry).toHaveBeenCalled();
		});

		it("deleteScenario handles lookup failure, not found, and delete error", async () => {
			// Act 1: lookup failure
			vi.mocked(getDb).mockRejectedValueOnce(new Error("Lookup fail"));
			const resLookup = await deleteScenario({ id: "s1" });
			expect(resLookup).toEqual({
				error: "Lookup fail",
				success: false,
			});

			// Act 2: not found
			const mockDbNotFound = {
				query: {
					scenarios: {
						findFirst: vi.fn().mockResolvedValue(null),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDbNotFound as never);
			const resNotFound = await deleteScenario({ id: "missing" });
			expect(resNotFound).toEqual({
				error: "Scenario not found",
				success: false,
			});

			// Act 3: delete error
			const existing = { id: "s1", vodId: "v1" };
			const mockDbDeleteError = {
				delete: vi.fn().mockReturnValue({
					where: vi.fn().mockRejectedValue(new Error("Delete fail")),
				}),
				query: {
					scenarios: {
						findFirst: vi.fn().mockResolvedValue(existing),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDbDeleteError as never);
			const resDeleteError = await deleteScenario({ id: "s1" });
			expect(resDeleteError).toEqual({
				error: "Delete fail",
				success: false,
			});
		});

		it("reorderScenarios validates order and updates timestamps", async () => {
			// Arrange
			const vodWithScenarios = {
				id: "v1",
				scenarios: [{ id: "s1" }, { id: "s2" }],
			};
			const mockDb = {
				query: {
					vods: {
						findFirst: vi.fn().mockImplementation((options) => {
							if (options?.where)
								options.where({ id: "v1" }, { and: vi.fn(), eq: vi.fn() });
							return Promise.resolve(vodWithScenarios);
						}),
					},
				},
				update: vi.fn().mockReturnValue({
					set: vi.fn().mockReturnValue({
						where: vi.fn().mockResolvedValue(undefined),
					}),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await reorderScenarios({
				actorUserId: "admin_1",
				scenarioOrders: [
					{ id: "s1", timestampSeconds: 30 },
					{ id: "s2", timestampSeconds: 60 },
				],
				vodId: "v1",
			});

			// Assert
			expect(result).toEqual({
				data: undefined,
				success: true,
			});
			expect(createAuditEntry).toHaveBeenCalled();
		});

		it("reorderScenarios handles errors and invalid orders", async () => {
			// Arrange
			const vodWithScenarios = {
				id: "v1",
				scenarios: [{ id: "s1" }],
			};
			const mockDb = {
				query: {
					vods: {
						findFirst: vi
							.fn()
							.mockRejectedValueOnce(new Error("Lookup failure"))
							.mockResolvedValueOnce(null)
							.mockResolvedValueOnce(vodWithScenarios)
							.mockResolvedValueOnce(vodWithScenarios)
							.mockResolvedValueOnce(vodWithScenarios),
					},
				},
				update: vi.fn().mockReturnValue({
					set: vi.fn().mockReturnValue({
						where: vi.fn().mockRejectedValue(new Error("Write error")),
					}),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act 1: getVodById error
			const resLookupFail = await reorderScenarios({
				scenarioOrders: [{ id: "s1", timestampSeconds: 10 }],
				vodId: "v1",
			});
			// Act 2: VOD not found
			const resNotFound = await reorderScenarios({
				scenarioOrders: [{ id: "s1", timestampSeconds: 10 }],
				vodId: "v1",
			});
			// Act 3: scenario not in VOD
			const resNotInVod = await reorderScenarios({
				scenarioOrders: [{ id: "s_foreign", timestampSeconds: 10 }],
				vodId: "v1",
			});
			// Act 4: invalid timestamp
			const resInvalidTs = await reorderScenarios({
				scenarioOrders: [{ id: "s1", timestampSeconds: -5 }],
				vodId: "v1",
			});
			// Act 5: update throws
			const resUpdateFail = await reorderScenarios({
				scenarioOrders: [{ id: "s1", timestampSeconds: 10 }],
				vodId: "v1",
			});

			// Assert
			expect(resLookupFail.success).toBe(false);
			expect(resNotFound).toEqual({
				error: "VOD not found",
				success: false,
			});
			expect(resNotInVod.success ? null : resNotInVod.error).toContain(
				"does not belong to VOD",
			);
			expect(resInvalidTs.success ? null : resInvalidTs.error).toContain(
				"must be a non-negative number",
			);
			expect(resUpdateFail).toEqual({
				error: "Write error",
				success: false,
			});
		});
	});

	describe("getSessionManifest", () => {
		it("loads published session manifest with module filters", async () => {
			// Arrange
			const mockVod = {
				id: "vod_1",
				scenarios: [{ id: "s1", moduleType: "STRATEGY", timestampSeconds: 20 }],
			};
			const mockDb = {
				query: {
					vods: {
						findFirst: vi.fn().mockImplementation((options) => {
							options?.where?.(
								{ id: "vod_1", isPublished: true },
								{ and: vi.fn(), eq: vi.fn() },
							);
							options?.with?.scenarios?.where?.(
								{ moduleType: "STRATEGY" },
								{ inArray: vi.fn(), sql: vi.fn() },
							);
							options?.with?.scenarios?.orderBy?.({}, { asc: vi.fn() });
							return Promise.resolve(mockVod);
						}),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await getSessionManifest("vod_1", {
				modules: ["STRATEGY"],
				publishedOnly: true,
			});

			// Assert
			expect(result).toEqual({
				data: mockVod,
				success: true,
			});
		});

		it("handles modules === null and unpublished requests", async () => {
			// Arrange
			const mockVod = { id: "vod_1", scenarios: [] };
			const mockDb = {
				query: {
					vods: {
						findFirst: vi.fn().mockImplementation((options) => {
							if (options?.where) {
								options.where({ id: "vod_1" }, { eq: vi.fn() });
							}
							if (options?.with?.scenarios?.where) {
								options.with.scenarios.where(
									{},
									{ inArray: vi.fn(), sql: vi.fn() },
								);
							}
							return Promise.resolve(mockVod);
						}),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act 1: null modules
			const resultNull = await getSessionManifest("vod_1", {
				modules: null as never,
				publishedOnly: false,
			});
			// Act 2: empty modules array
			const resultEmpty = await getSessionManifest("vod_1", {
				modules: [],
				publishedOnly: false,
			});

			// Assert
			expect(resultNull).toEqual({
				data: mockVod,
				success: true,
			});
			expect(resultEmpty).toEqual({
				data: mockVod,
				success: true,
			});
		});

		it("returns null data when vod is not found in getSessionManifest", async () => {
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
			const result = await getSessionManifest("vod_missing");

			// Assert
			expect(result).toEqual({
				data: null,
				success: true,
			});
		});

		it("handles database error during getSessionManifest", async () => {
			// Arrange
			vi.mocked(getDb).mockRejectedValue(new Error("Manifest query failed"));

			// Act
			const result = await getSessionManifest("vod_1");

			// Assert
			expect(result).toEqual({
				error: "Manifest query failed",
				success: false,
			});
		});
	});
});
