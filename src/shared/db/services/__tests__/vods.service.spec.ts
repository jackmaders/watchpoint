import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "../../core/client";
import { vodService } from "../vods.service";

vi.mock("../../core/client");

describe("vodService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("listPublished", () => {
		it("returns published vods with scenarios", async () => {
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
			const result = await vodService.listPublished();

			// Assert
			expect(result).toEqual({
				data: mockVods,
				success: true,
			});
		});

		it("handles database error (Error and non-Error)", async () => {
			// Arrange
			vi.mocked(getDb)
				.mockRejectedValueOnce(new Error("Query failed"))
				.mockRejectedValueOnce("String error");

			// Act
			const res1 = await vodService.listPublished();
			const res2 = await vodService.listPublished();

			// Assert
			expect(res1).toEqual({
				error: "Query failed",
				success: false,
			});
			expect(res2).toEqual({
				error: "Failed to retrieve published VODs",
				success: false,
			});
		});
	});

	describe("listAdmin", () => {
		it("filters by options with escaped search, role, and pagination", async () => {
			// Arrange
			const mockVods = [{ id: "vod_admin", title: "Admin VOD" }];
			const mockDb = {
				query: {
					vods: {
						findMany: vi.fn().mockResolvedValue(mockVods),
					},
				},
				select: vi.fn().mockReturnValue({
					from: vi.fn().mockReturnValue({
						where: vi.fn().mockResolvedValue([{ value: 1 }]),
					}),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await vodService.listAdmin({
				isPublished: false,
				page: 1,
				pageSize: 10,
				role: "SUPPORT",
				search: "Ana%_\\",
			});

			// Assert
			expect(result).toEqual({
				data: {
					items: mockVods,
					page: 1,
					pageSize: 10,
					total: 1,
					totalPages: 1,
				},
				success: true,
			});
		});

		it("filters by search query only without base conditions", async () => {
			// Arrange
			const mockVods = [{ id: "vod_admin", title: "Admin VOD" }];
			const mockDb = {
				query: {
					vods: {
						findMany: vi.fn().mockResolvedValue(mockVods),
					},
				},
				select: vi.fn().mockReturnValue({
					from: vi.fn().mockReturnValue({
						where: vi.fn().mockResolvedValue([{ value: 1 }]),
					}),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await vodService.listAdmin({
				search: "Ana",
			});

			// Assert
			expect(result).toEqual({
				data: {
					items: mockVods,
					page: 1,
					pageSize: 10,
					total: 1,
					totalPages: 1,
				},
				success: true,
			});
		});

		it("handles empty options", async () => {
			// Arrange
			const mockDb = {
				query: {
					vods: {
						findMany: vi.fn().mockResolvedValue([]),
					},
				},
				select: vi.fn().mockReturnValue({
					from: vi.fn().mockReturnValue({
						where: vi.fn().mockResolvedValue([]),
					}),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await vodService.listAdmin();

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

		it("handles database errors (Error and non-Error)", async () => {
			// Arrange
			vi.mocked(getDb)
				.mockRejectedValueOnce(new Error("D1 query failure"))
				.mockRejectedValueOnce("String error");

			// Act
			const res1 = await vodService.listAdmin();
			const res2 = await vodService.listAdmin();

			// Assert
			expect(res1).toEqual({
				error: "D1 query failure",
				success: false,
			});
			expect(res2).toEqual({
				error: "Failed to retrieve admin VODs",
				success: false,
			});
		});
	});

	describe("getById", () => {
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
								options.where({ id: "vod_1" }, { eq: vi.fn() });
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
			const result = await vodService.getById({ id: "vod_1" });

			// Assert
			expect(result).toEqual({
				data: mockVod,
				success: true,
			});
		});

		it("returns null when vod not found", async () => {
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
			const result = await vodService.getById({ id: "vod_missing" });

			// Assert
			expect(result).toEqual({
				data: null,
				success: true,
			});
		});

		it("handles database errors (Error and non-Error)", async () => {
			// Arrange
			vi.mocked(getDb)
				.mockRejectedValueOnce(new Error("Lookup failed"))
				.mockRejectedValueOnce("String error");

			// Act
			const res1 = await vodService.getById({ id: "vod_1" });
			const res2 = await vodService.getById({ id: "vod_1" });

			// Assert
			expect(res1).toEqual({
				error: "Lookup failed",
				success: false,
			});
			expect(res2).toEqual({
				error: "Failed to retrieve VOD by ID",
				success: false,
			});
		});
	});

	describe("getSessionManifest", () => {
		it("retrieves session manifest with module filtering and publishedOnly options", async () => {
			// Arrange
			const mockVod = {
				id: "vod_1",
				isPublished: true,
				scenarios: [{ id: "sc_1", moduleType: "STRATEGY" }],
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
			const resWithModules = await vodService.getSessionManifest({
				id: "vod_1",
				modules: ["STRATEGY"],
				publishedOnly: true,
			});
			const resPublishedFalse = await vodService.getSessionManifest({
				id: "vod_1",
				publishedOnly: false,
			});
			const resNullModules = await vodService.getSessionManifest({
				id: "vod_1",
				modules: null,
			});
			const resEmptyModules = await vodService.getSessionManifest({
				id: "vod_1",
				modules: [],
			});

			vi.mocked(getDb).mockResolvedValueOnce({
				query: { vods: { findFirst: vi.fn().mockResolvedValue(null) } },
			} as never);
			const resNullVod = await vodService.getSessionManifest({
				id: "vod_null",
			});

			// Assert
			expect(resWithModules).toEqual({ data: mockVod, success: true });
			expect(resPublishedFalse).toEqual({ data: mockVod, success: true });
			expect(resNullModules).toEqual({ data: mockVod, success: true });
			expect(resEmptyModules).toEqual({ data: mockVod, success: true });
			expect(resNullVod).toEqual({ data: null, success: true });
		});

		it("handles database errors (Error and non-Error)", async () => {
			// Arrange
			vi.mocked(getDb)
				.mockRejectedValueOnce(new Error("Manifest failed"))
				.mockRejectedValueOnce("String error");

			// Act
			const res1 = await vodService.getSessionManifest({ id: "vod_1" });
			const res2 = await vodService.getSessionManifest({ id: "vod_1" });

			// Assert
			expect(res1).toEqual({
				error: "Manifest failed",
				success: false,
			});
			expect(res2).toEqual({
				error: "Failed to retrieve session manifest",
				success: false,
			});
		});
	});

	describe("create", () => {
		const validCreateInput = {
			actorUserId: "usr_1",
			durationSeconds: 600,
			heroName: "Ana",
			mapName: "Kings Row",
			rankTier: "Grandmaster",
			role: "SUPPORT" as const,
			title: "Ana Gameplay",
			youtubeVideoId: "dQw4w9WgXcQ",
		};

		it("rejects publishing on creation", async () => {
			// Arrange & Act
			const result = await vodService.create({
				...validCreateInput,
				isPublished: true,
			});

			// Assert
			expect(result).toEqual({
				error: "Cannot publish a VOD with zero scenarios",
				success: false,
			});
		});

		it("validates input against schema", async () => {
			// Arrange & Act
			const result = await vodService.create({
				...validCreateInput,
				durationSeconds: -1,
			});

			// Assert
			expect(result.success).toBe(false);
		});

		it("creates vod and audit log on success", async () => {
			// Arrange
			const createdVod = {
				...validCreateInput,
				createdAt: new Date(),
				id: "vod_new",
				isPublished: false,
			};
			const mockDb = {
				insert: vi.fn().mockReturnValue({
					values: vi.fn().mockReturnValue({
						returning: vi
							.fn()
							.mockResolvedValueOnce([createdVod])
							.mockResolvedValueOnce([{ id: "audit_1" }]),
					}),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await vodService.create(validCreateInput);

			// Assert
			expect(result).toEqual({
				data: createdVod,
				success: true,
			});
		});

		it("creates unassigned VOD when actorUserId is omitted", async () => {
			// Arrange
			const unassignedInput = { ...validCreateInput, actorUserId: undefined };

			const createdVod = {
				createdAt: new Date(),
				durationSeconds: 1200,
				heroName: "Ana",
				id: "vod_unassigned",
				isPublished: false,
				mapName: "King's Row",
				rankTier: "Grandmaster",
				role: "SUPPORT" as const,
				title: "Ana VOD Review",
				youtubeVideoId: "dQw4w9WgXcQ",
			};

			const mockDb = {
				insert: vi.fn().mockReturnValue({
					values: vi.fn().mockReturnValue({
						returning: vi
							.fn()
							.mockResolvedValueOnce([createdVod])
							.mockResolvedValueOnce([{ id: "audit_unassigned" }]),
					}),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await vodService.create(unassignedInput);

			// Assert
			expect(result).toEqual({
				data: createdVod,
				success: true,
			});
		});

		it("handles database insert returning empty array", async () => {
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
			const result = await vodService.create(validCreateInput);

			// Assert
			expect(result).toEqual({
				error: "Failed to create VOD",
				success: false,
			});
		});

		it("handles exceptions (Error and non-Error)", async () => {
			// Arrange
			vi.mocked(getDb)
				.mockRejectedValueOnce(new Error("DB insert error"))
				.mockRejectedValueOnce("String error");

			// Act
			const res1 = await vodService.create(validCreateInput);
			const res2 = await vodService.create(validCreateInput);

			// Assert
			expect(res1).toEqual({
				error: "DB insert error",
				success: false,
			});
			expect(res2).toEqual({
				error: "Failed to create VOD",
				success: false,
			});
		});
	});

	describe("update", () => {
		const mockExistingVod = {
			createdAt: new Date(),
			durationSeconds: 600,
			heroName: "Ana",
			id: "vod_1",
			isPublished: false,
			mapName: "Kings Row",
			rankTier: "Grandmaster",
			role: "SUPPORT" as const,
			scenarios: [
				{
					explanationText: "Valid",
					id: "sc_1",
					imageUrl: null,
					inputConfig: {
						options: [
							{ id: "opt_1", is_correct: true, text: "A" },
							{ id: "opt_2", is_correct: false, text: "B" },
						],
					},
					inputType: "MULTIPLE_CHOICE" as const,
					moduleType: "STRATEGY" as const,
					promptText: "Question?",
					timeLimitSeconds: 10,
					timestampSeconds: 60,
					vodId: "vod_1",
				},
			],
			title: "Existing VOD",
			youtubeVideoId: "dQw4w9WgXcQ",
		};

		it("handles getById failure and not found", async () => {
			// Arrange
			vi.mocked(getDb)
				.mockRejectedValueOnce(new Error("Lookup fail"))
				.mockResolvedValueOnce({
					query: { vods: { findFirst: vi.fn().mockResolvedValue(null) } },
				} as never);

			// Act
			const res1 = await vodService.update({ id: "vod_1" });
			const res2 = await vodService.update({ id: "vod_1" });

			// Assert
			expect(res1).toEqual({ error: "Lookup fail", success: false });
			expect(res2).toEqual({ error: "VOD not found", success: false });
		});

		it("validates publishing constraints on update", async () => {
			// Arrange
			const invalidVod = { ...mockExistingVod, scenarios: [] };
			const mockDb = {
				query: {
					vods: {
						findFirst: vi.fn().mockResolvedValue(invalidVod),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await vodService.update({
				id: "vod_1",
				isPublished: true,
			});

			// Assert
			expect(result.success).toBe(false);
		});

		it("updates vod and records audit entries on success", async () => {
			// Arrange
			const mockDb = {
				insert: vi.fn().mockReturnValue({
					values: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([{ id: "audit_1" }]),
					}),
				}),
				query: {
					vods: {
						findFirst: vi.fn().mockResolvedValue(mockExistingVod),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);
			// Act 1: Updating fields without changing publication status
			const updatedVod1 = {
				...mockExistingVod,
				durationSeconds: 700,
				heroName: "Mercy",
				mapName: "Oasis",
				rankTier: "Top 500",
				role: "SUPPORT" as const,
				title: "Updated Title",
				youtubeVideoId: "new_vid",
			};
			const mockDb1 = {
				insert: vi.fn().mockReturnValue({
					values: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([{ id: "audit_1" }]),
					}),
				}),
				query: {
					vods: {
						findFirst: vi.fn().mockResolvedValue(mockExistingVod),
					},
				},
				update: vi.fn().mockReturnValue({
					set: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							returning: vi.fn().mockResolvedValue([updatedVod1]),
						}),
					}),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb1 as never);

			const result1 = await vodService.update({
				actorUserId: "usr_1",
				durationSeconds: 700,
				heroName: "Mercy",
				id: "vod_1",
				mapName: "Oasis",
				rankTier: "Top 500",
				role: "SUPPORT",
				title: "Updated Title",
				youtubeVideoId: "new_vid",
			});

			// Act 2: Unpublishing a published vod
			const publishedExisting = { ...mockExistingVod, isPublished: true };
			const updatedVod2 = { ...publishedExisting, isPublished: false };
			const mockDb2 = {
				insert: vi.fn().mockReturnValue({
					values: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([{ id: "audit_1" }]),
					}),
				}),
				query: {
					vods: {
						findFirst: vi.fn().mockResolvedValue(publishedExisting),
					},
				},
				update: vi.fn().mockReturnValue({
					set: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							returning: vi.fn().mockResolvedValue([updatedVod2]),
						}),
					}),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb2 as never);

			const result2 = await vodService.update({
				actorUserId: "usr_1",
				id: "vod_1",
				isPublished: false,
			});

			// Assert
			expect(result1).toEqual({
				data: updatedVod1,
				success: true,
			});
			expect(result2).toEqual({
				data: updatedVod2,
				success: true,
			});
		});

		it("handles update returning empty array and exceptions", async () => {
			// Arrange
			const mockDbEmpty = {
				query: {
					vods: {
						findFirst: vi.fn().mockResolvedValue(mockExistingVod),
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

			// Act
			const res1 = await vodService.update({ id: "vod_1", title: "New" });

			const mockDbError = {
				query: {
					vods: {
						findFirst: vi.fn().mockResolvedValue(mockExistingVod),
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
			const res2 = await vodService.update({ id: "vod_1", title: "New" });

			const mockDbStringError = {
				query: {
					vods: {
						findFirst: vi.fn().mockResolvedValue(mockExistingVod),
					},
				},
				update: vi.fn().mockReturnValue({
					set: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							returning: vi.fn().mockRejectedValue("String error"),
						}),
					}),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDbStringError as never);
			const res3 = await vodService.update({ id: "vod_1", title: "New" });

			// Assert
			expect(res1).toEqual({ error: "Failed to update VOD", success: false });
			expect(res2).toEqual({ error: "Update fail", success: false });
			expect(res3).toEqual({ error: "Failed to update VOD", success: false });
		});
	});

	describe("delete", () => {
		const mockExistingVod = {
			durationSeconds: 600,
			heroName: "Ana",
			id: "vod_1",
			mapName: "Kings Row",
			role: "SUPPORT" as const,
			title: "VOD",
		};

		it("handles getById error and not found", async () => {
			// Arrange
			vi.mocked(getDb)
				.mockRejectedValueOnce(new Error("Lookup fail"))
				.mockResolvedValueOnce({
					query: { vods: { findFirst: vi.fn().mockResolvedValue(null) } },
				} as never);

			// Act
			const res1 = await vodService.delete({ id: "vod_1" });
			const res2 = await vodService.delete({ id: "vod_1" });

			// Assert
			expect(res1).toEqual({ error: "Lookup fail", success: false });
			expect(res2).toEqual({ error: "VOD not found", success: false });
		});

		it("deletes vod and logs audit", async () => {
			// Arrange
			const mockDb = {
				delete: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue(undefined),
				}),
				insert: vi.fn().mockReturnValue({
					values: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([{ id: "audit_1" }]),
					}),
				}),
				query: {
					vods: {
						findFirst: vi.fn().mockResolvedValue(mockExistingVod),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await vodService.delete({
				actorUserId: "usr_1",
				id: "vod_1",
			});

			// Assert
			expect(result).toEqual({ data: null, success: true });
		});

		it("handles delete exceptions (Error and non-Error)", async () => {
			// Arrange
			const mockDbError = {
				delete: vi.fn().mockReturnValue({
					where: vi.fn().mockRejectedValue(new Error("Delete fail")),
				}),
				query: {
					vods: {
						findFirst: vi.fn().mockResolvedValue(mockExistingVod),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDbError as never);
			const res1 = await vodService.delete({ id: "vod_1" });

			const mockDbStringError = {
				delete: vi.fn().mockReturnValue({
					where: vi.fn().mockRejectedValue("String error"),
				}),
				query: {
					vods: {
						findFirst: vi.fn().mockResolvedValue(mockExistingVod),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDbStringError as never);
			const res2 = await vodService.delete({ id: "vod_1" });

			// Assert
			expect(res1).toEqual({ error: "Delete fail", success: false });
			expect(res2).toEqual({ error: "Failed to delete VOD", success: false });
		});
	});

	describe("bulkPublish and bulkDelete", () => {
		it("setPublicationStatus and bulkPublish handle mixed outcomes", async () => {
			// Arrange
			const mockDb = {
				insert: vi.fn().mockReturnValue({
					values: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([{ id: "audit_1" }]),
					}),
				}),
				query: {
					vods: {
						findFirst: vi
							.fn()
							.mockResolvedValueOnce({
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
												{ id: "opt_1", is_correct: true, text: "A" },
												{ id: "opt_2", is_correct: false, text: "B" },
											],
										},
										inputType: "MULTIPLE_CHOICE",
										promptText: "P",
										timestampSeconds: 10,
									},
								],
							})
							.mockResolvedValueOnce({
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
												{ id: "opt_1", is_correct: true, text: "A" },
												{ id: "opt_2", is_correct: false, text: "B" },
											],
										},
										inputType: "MULTIPLE_CHOICE",
										promptText: "P",
										timestampSeconds: 10,
									},
								],
							})
							.mockResolvedValueOnce(null),
					},
				},
				update: vi.fn().mockReturnValue({
					set: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							returning: vi.fn().mockResolvedValue([{ id: "v1" }]),
						}),
					}),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const singleRes = await vodService.setPublicationStatus({
				id: "v1",
				isPublished: true,
			});
			const bulkRes = await vodService.bulkPublish({
				ids: ["v1", "v2"],
				isPublished: true,
			});

			// Assert
			expect(singleRes.success).toBe(true);
			expect(bulkRes).toEqual({
				data: {
					failed: [{ error: "VOD not found", id: "v2" }],
					succeeded: ["v1"],
				},
				success: true,
			});
		});

		it("bulkDelete handles mixed outcomes", async () => {
			// Arrange
			const mockDb = {
				delete: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue(undefined),
				}),
				insert: vi.fn().mockReturnValue({
					values: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([{ id: "audit_1" }]),
					}),
				}),
				query: {
					vods: {
						findFirst: vi
							.fn()
							.mockResolvedValueOnce({ id: "v1" })
							.mockResolvedValueOnce(null),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await vodService.bulkDelete({ ids: ["v1", "v2"] });

			// Assert
			expect(result).toEqual({
				data: {
					failed: [{ error: "VOD not found", id: "v2" }],
					succeeded: ["v1"],
				},
				success: true,
			});
		});
	});

	describe("scenarios operations", () => {
		const validScenarioInput = {
			actorUserId: "usr_1",
			explanationText: "Explanation",
			imageUrl: "https://example.com/img.png",
			inputConfig: {
				options: [
					{ id: "opt_1", is_correct: true, text: "Option A" },
					{ id: "opt_2", is_correct: false, text: "Option B" },
				],
			},
			inputType: "MULTIPLE_CHOICE" as const,
			moduleType: "STRATEGY" as const,
			promptText: "What should you do?",
			timeLimitSeconds: 15,
			timestampSeconds: 120,
			vodId: "vod_1",
		};

		it("getScenarioById and getScenariosByVodId work and handle errors", async () => {
			// Arrange
			const mockScenario = { id: "sc_1", ...validScenarioInput };
			const mockDb = {
				query: {
					scenarios: {
						findFirst: vi.fn().mockImplementation((options) => {
							if (options?.where) {
								options.where({ id: "sc_1" }, { eq: vi.fn() });
							}
							return Promise.resolve(mockScenario);
						}),
						findMany: vi.fn().mockImplementation((options) => {
							if (options?.where) {
								options.where({ vodId: "vod_1" }, { eq: vi.fn() });
							}
							if (options?.orderBy) {
								options.orderBy({ timestampSeconds: 10 }, { asc: vi.fn() });
							}
							return Promise.resolve([mockScenario]);
						}),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const resOne = await vodService.getScenarioById({ id: "sc_1" });
			const resMany = await vodService.getScenariosByVodId({ vodId: "vod_1" });

			// Assert
			expect(resOne).toEqual({ data: mockScenario, success: true });
			expect(resMany).toEqual({ data: [mockScenario], success: true });

			// Error handling
			vi.mocked(getDb)
				.mockRejectedValueOnce(new Error("Sc query err"))
				.mockRejectedValueOnce("Str err")
				.mockRejectedValueOnce(new Error("Scs query err"))
				.mockRejectedValueOnce("Str err");

			expect(await vodService.getScenarioById({ id: "sc_1" })).toEqual({
				error: "Sc query err",
				success: false,
			});
			expect(await vodService.getScenarioById({ id: "sc_1" })).toEqual({
				error: "Failed to retrieve scenario",
				success: false,
			});
			expect(await vodService.getScenariosByVodId({ vodId: "vod_1" })).toEqual({
				error: "Scs query err",
				success: false,
			});
			expect(await vodService.getScenariosByVodId({ vodId: "vod_1" })).toEqual({
				error: "Failed to retrieve scenarios",
				success: false,
			});
		});

		it("createScenario validates config, vod lookup, and timestamp bounds", async () => {
			// Arrange
			const invalidConfig = {
				...validScenarioInput,
				promptText: "",
			};

			// Act 1: Invalid config
			const resInvalid = await vodService.createScenario(invalidConfig);
			expect(resInvalid.success).toBe(false);

			// Act 2: VOD lookup error & not found
			vi.mocked(getDb)
				.mockRejectedValueOnce(new Error("VOD error"))
				.mockResolvedValueOnce({
					query: { vods: { findFirst: vi.fn().mockResolvedValue(null) } },
				} as never);

			const resVodErr = await vodService.createScenario(validScenarioInput);
			const resVodNotFound =
				await vodService.createScenario(validScenarioInput);

			expect(resVodErr).toEqual({ error: "VOD error", success: false });
			expect(resVodNotFound).toEqual({
				error: "VOD not found",
				success: false,
			});

			// Act 3: Timestamp exceeds duration
			vi.mocked(getDb).mockResolvedValue({
				query: {
					vods: {
						findFirst: vi.fn().mockResolvedValue({ durationSeconds: 60 }),
					},
				},
			} as never);

			const resExceed = await vodService.createScenario({
				...validScenarioInput,
				timestampSeconds: 100,
			});
			expect(resExceed).toEqual({
				error: "Scenario timestamp (100s) exceeds VOD duration (60s)",
				success: false,
			});

			// Act 4: Success creation
			const createdScenario = { id: "sc_new", ...validScenarioInput };
			const mockDbSuccess = {
				insert: vi.fn().mockReturnValue({
					values: vi.fn().mockReturnValue({
						returning: vi
							.fn()
							.mockResolvedValueOnce([createdScenario])
							.mockResolvedValueOnce([{ id: "audit_1" }]),
					}),
				}),
				query: {
					vods: {
						findFirst: vi.fn().mockResolvedValue({ durationSeconds: 600 }),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDbSuccess as never);

			const resSuccess = await vodService.createScenario(validScenarioInput);
			expect(resSuccess).toEqual({ data: createdScenario, success: true });

			// Act 4b: Success creation with optional fields omitted
			const minimalScenarioInput = {
				...validScenarioInput,
				imageUrl: undefined,
				timeLimitSeconds: undefined,
			};
			const minimalCreatedScenario = {
				...createdScenario,
				imageUrl: null,
				timeLimitSeconds: null,
			};
			const mockDbMinimal = {
				insert: vi.fn().mockReturnValue({
					values: vi.fn().mockReturnValue({
						returning: vi
							.fn()
							.mockResolvedValueOnce([minimalCreatedScenario])
							.mockResolvedValueOnce([{ id: "audit_1" }]),
					}),
				}),
				query: {
					vods: {
						findFirst: vi.fn().mockResolvedValue({ durationSeconds: 600 }),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDbMinimal as never);
			const resMinimal = await vodService.createScenario(minimalScenarioInput);
			expect(resMinimal).toEqual({
				data: minimalCreatedScenario,
				success: true,
			});

			// Act 5: database returns empty or throws
			const mockDbEmptyScenario = {
				insert: vi.fn().mockReturnValue({
					values: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([]),
					}),
				}),
				query: {
					vods: {
						findFirst: vi.fn().mockResolvedValue({ durationSeconds: 600 }),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDbEmptyScenario as never);
			expect(await vodService.createScenario(validScenarioInput)).toEqual({
				error: "Failed to create scenario",
				success: false,
			});

			const mockDbCreateErr = {
				insert: vi.fn().mockReturnValue({
					values: vi.fn().mockReturnValue({
						returning: vi.fn().mockRejectedValue(new Error("Create err")),
					}),
				}),
				query: {
					vods: {
						findFirst: vi.fn().mockResolvedValue({ durationSeconds: 600 }),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDbCreateErr as never);
			expect(await vodService.createScenario(validScenarioInput)).toEqual({
				error: "Create err",
				success: false,
			});

			const mockDbCreateStrErr = {
				insert: vi.fn().mockReturnValue({
					values: vi.fn().mockReturnValue({
						returning: vi.fn().mockRejectedValue("Str err"),
					}),
				}),
				query: {
					vods: {
						findFirst: vi.fn().mockResolvedValue({ durationSeconds: 600 }),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDbCreateStrErr as never);
			expect(await vodService.createScenario(validScenarioInput)).toEqual({
				error: "Failed to create scenario",
				success: false,
			});
		});

		it("updateScenario handles not found, validation error, success and failures", async () => {
			// Arrange
			const existingScenario = { id: "sc_1", ...validScenarioInput };

			// Act 1: Not found or error in lookup
			vi.mocked(getDb)
				.mockRejectedValueOnce(new Error("Lookup err"))
				.mockResolvedValueOnce({
					query: { scenarios: { findFirst: vi.fn().mockResolvedValue(null) } },
				} as never);

			expect(await vodService.updateScenario({ id: "sc_1" })).toEqual({
				error: "Lookup err",
				success: false,
			});
			expect(await vodService.updateScenario({ id: "sc_1" })).toEqual({
				error: "Scenario not found",
				success: false,
			});

			// Act 2: Validation failure on update
			vi.mocked(getDb).mockResolvedValue({
				query: {
					scenarios: {
						findFirst: vi.fn().mockResolvedValue(existingScenario),
					},
				},
			} as never);
			const resInvalid = await vodService.updateScenario({
				id: "sc_1",
				promptText: "",
			});
			expect(resInvalid.success).toBe(false);

			// Act 3: Success update
			const updatedScenario = { ...existingScenario, promptText: "New Prompt" };
			const mockDbSuccess = {
				insert: vi.fn().mockReturnValue({
					values: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([{ id: "audit_1" }]),
					}),
				}),
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
			vi.mocked(getDb).mockResolvedValue(mockDbSuccess as never);

			const resSuccess = await vodService.updateScenario({
				explanationText: "New E",
				id: "sc_1",
				imageUrl: "img",
				inputConfig: existingScenario.inputConfig,
				inputType: "MULTIPLE_CHOICE",
				moduleType: "STRATEGY",
				promptText: "New Prompt",
				timeLimitSeconds: 20,
				timestampSeconds: 50,
			});
			expect(resSuccess).toEqual({ data: updatedScenario, success: true });

			// Act 4: Table update returns empty or throws
			const mockDbEmptyUpdate = {
				query: {
					scenarios: {
						findFirst: vi.fn().mockResolvedValue(existingScenario),
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
			vi.mocked(getDb).mockResolvedValue(mockDbEmptyUpdate as never);
			expect(await vodService.updateScenario({ id: "sc_1" })).toEqual({
				error: "Failed to update scenario",
				success: false,
			});

			const mockDbUpdateErr = {
				query: {
					scenarios: {
						findFirst: vi.fn().mockResolvedValue(existingScenario),
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
			vi.mocked(getDb).mockResolvedValue(mockDbUpdateErr as never);
			expect(await vodService.updateScenario({ id: "sc_1" })).toEqual({
				error: "Update fail",
				success: false,
			});

			const mockDbUpdateStrErr = {
				query: {
					scenarios: {
						findFirst: vi.fn().mockResolvedValue(existingScenario),
					},
				},
				update: vi.fn().mockReturnValue({
					set: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							returning: vi.fn().mockRejectedValue("Str err"),
						}),
					}),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDbUpdateStrErr as never);
			expect(await vodService.updateScenario({ id: "sc_1" })).toEqual({
				error: "Failed to update scenario",
				success: false,
			});
		});

		it("deleteScenario handles lookup errors, not found, delete and failures", async () => {
			// Arrange
			const existingScenario = { id: "sc_1", ...validScenarioInput };

			// Act 1: Lookup error and not found
			vi.mocked(getDb)
				.mockRejectedValueOnce(new Error("Lookup fail"))
				.mockResolvedValueOnce({
					query: { scenarios: { findFirst: vi.fn().mockResolvedValue(null) } },
				} as never);

			expect(await vodService.deleteScenario({ id: "sc_1" })).toEqual({
				error: "Lookup fail",
				success: false,
			});
			expect(await vodService.deleteScenario({ id: "sc_1" })).toEqual({
				error: "Scenario not found",
				success: false,
			});

			// Act 2: Success
			const mockDbSuccess = {
				delete: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue(undefined),
				}),
				insert: vi.fn().mockReturnValue({
					values: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([{ id: "audit_1" }]),
					}),
				}),
				query: {
					scenarios: {
						findFirst: vi.fn().mockResolvedValue(existingScenario),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDbSuccess as never);

			const resSuccess = await vodService.deleteScenario({ id: "sc_1" });
			expect(resSuccess).toEqual({ data: null, success: true });

			// Act 3: Exception during delete
			const mockDbDeleteErr = {
				delete: vi.fn().mockReturnValue({
					where: vi.fn().mockRejectedValue(new Error("Delete fail")),
				}),
				query: {
					scenarios: {
						findFirst: vi.fn().mockResolvedValue(existingScenario),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDbDeleteErr as never);
			expect(await vodService.deleteScenario({ id: "sc_1" })).toEqual({
				error: "Delete fail",
				success: false,
			});

			const mockDbDeleteStrErr = {
				delete: vi.fn().mockReturnValue({
					where: vi.fn().mockRejectedValue("Str err"),
				}),
				query: {
					scenarios: {
						findFirst: vi.fn().mockResolvedValue(existingScenario),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDbDeleteStrErr as never);
			expect(await vodService.deleteScenario({ id: "sc_1" })).toEqual({
				error: "Failed to delete scenario",
				success: false,
			});
		});

		it("reorderScenarios validates vod lookup, foreign ids, invalid timestamps, and performs updates", async () => {
			// Arrange
			const mockVod = {
				id: "vod_1",
				scenarios: [{ id: "sc_1", timestampSeconds: 10 }],
			};

			// Act 1: VOD lookup error and not found
			vi.mocked(getDb)
				.mockRejectedValueOnce(new Error("VOD error"))
				.mockResolvedValueOnce({
					query: { vods: { findFirst: vi.fn().mockResolvedValue(null) } },
				} as never);

			expect(
				await vodService.reorderScenarios({
					scenarioOrders: [{ id: "sc_1", timestampSeconds: 20 }],
					vodId: "vod_1",
				}),
			).toEqual({ error: "VOD error", success: false });
			expect(
				await vodService.reorderScenarios({
					scenarioOrders: [{ id: "sc_1", timestampSeconds: 20 }],
					vodId: "vod_1",
				}),
			).toEqual({ error: "VOD not found", success: false });

			// Act 2: Scenario ID does not belong to VOD
			vi.mocked(getDb).mockResolvedValue({
				query: { vods: { findFirst: vi.fn().mockResolvedValue(mockVod) } },
			} as never);

			expect(
				await vodService.reorderScenarios({
					scenarioOrders: [{ id: "sc_foreign", timestampSeconds: 20 }],
					vodId: "vod_1",
				}),
			).toEqual({
				error: "Scenario sc_foreign does not belong to VOD vod_1",
				success: false,
			});

			// Act 3: Invalid timestamp
			expect(
				await vodService.reorderScenarios({
					scenarioOrders: [{ id: "sc_1", timestampSeconds: -5 }],
					vodId: "vod_1",
				}),
			).toEqual({
				error: "Scenario timestamp must be a non-negative number",
				success: false,
			});
			expect(
				await vodService.reorderScenarios({
					scenarioOrders: [{ id: "sc_1", timestampSeconds: Number.NaN }],
					vodId: "vod_1",
				}),
			).toEqual({
				error: "Scenario timestamp must be a non-negative number",
				success: false,
			});

			// Act 4: Success
			const mockTx = {
				update: vi.fn().mockReturnValue({
					set: vi.fn().mockReturnValue({
						where: vi.fn().mockResolvedValue([]),
					}),
				}),
			};
			const mockDbSuccess = {
				insert: vi.fn().mockReturnValue({
					values: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([{ id: "audit_1" }]),
					}),
				}),
				query: { vods: { findFirst: vi.fn().mockResolvedValue(mockVod) } },
				transaction: vi.fn(async (cb: (tx: typeof mockTx) => unknown) =>
					cb(mockTx),
				),
			};
			vi.mocked(getDb).mockResolvedValue(mockDbSuccess as never);

			const resSuccess = await vodService.reorderScenarios({
				scenarioOrders: [{ id: "sc_1", timestampSeconds: 25 }],
				vodId: "vod_1",
			});
			expect(resSuccess).toEqual({ data: null, success: true });

			// Act 5: Reorder update error (Error and non-Error)
			const mockTxError = {
				update: vi.fn().mockReturnValue({
					set: vi.fn().mockReturnValue({
						where: vi.fn().mockRejectedValue(new Error("Update fail")),
					}),
				}),
			};
			const mockDbError = {
				query: { vods: { findFirst: vi.fn().mockResolvedValue(mockVod) } },
				transaction: vi.fn(async (cb: (tx: typeof mockTxError) => unknown) =>
					cb(mockTxError),
				),
			};
			const mockTxString = {
				update: vi.fn().mockReturnValue({
					set: vi.fn().mockReturnValue({
						where: vi.fn().mockRejectedValue("Str err"),
					}),
				}),
			};
			const mockDbString = {
				query: { vods: { findFirst: vi.fn().mockResolvedValue(mockVod) } },
				transaction: vi.fn(async (cb: (tx: typeof mockTxString) => unknown) =>
					cb(mockTxString),
				),
			};
			vi.mocked(getDb).mockResolvedValue(mockDbError as never);

			const errRes1 = await vodService.reorderScenarios({
				scenarioOrders: [{ id: "sc_1", timestampSeconds: 25 }],
				vodId: "vod_1",
			});

			vi.mocked(getDb).mockResolvedValue(mockDbString as never);
			const errRes2 = await vodService.reorderScenarios({
				scenarioOrders: [{ id: "sc_1", timestampSeconds: 25 }],
				vodId: "vod_1",
			});

			expect(errRes1).toEqual({ error: "Update fail", success: false });
			expect(errRes2).toEqual({
				error: "Failed to reorder scenarios",
				success: false,
			});
		});
	});
});
