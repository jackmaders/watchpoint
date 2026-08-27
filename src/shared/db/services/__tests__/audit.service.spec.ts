import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "../../core/client";
import {
	auditService,
	createAuditEntry,
	getAuditEntries,
	getAuditLogs,
} from "../audit.service";

vi.mock("../../core/client");

describe("auditService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("create", () => {
		it("inserts and returns audit entry with optional fields omitted", async () => {
			// Arrange
			const mockEntry = {
				action: "TEST_ACTION",
				actorUserId: null,
				createdAt: new Date(),
				entityId: "ent_1",
				entityType: "VOD",
				id: "audit_1",
				metadata: {},
			};
			const mockDb = {
				insert: vi.fn().mockReturnValue({
					values: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([mockEntry]),
					}),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await auditService.create({
				action: "TEST_ACTION",
				entityId: "ent_1",
				entityType: "VOD",
			});

			// Assert
			expect(result).toEqual({
				data: mockEntry,
				success: true,
			});
		});

		it("handles empty returning array", async () => {
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
			const result = await createAuditEntry({
				action: "FAIL_ACTION",
				actorUserId: "usr_1",
				entityId: "ent_fail",
				entityType: "VOD",
				metadata: { foo: "bar" },
			});

			// Assert
			expect(result).toEqual({
				error: "Failed to create audit entry",
				success: false,
			});
		});

		it("handles database exceptions (Error and non-Error)", async () => {
			// Arrange
			vi.mocked(getDb)
				.mockRejectedValueOnce(new Error("D1 insert failure"))
				.mockRejectedValueOnce("D1 insert string failure");

			// Act
			const res1 = await auditService.create({
				action: "FAIL_ACTION",
				entityId: "ent_fail",
				entityType: "VOD",
			});
			const res2 = await auditService.create({
				action: "FAIL_ACTION",
				entityId: "ent_fail",
				entityType: "VOD",
			});

			// Assert
			expect(res1).toEqual({
				error: "D1 insert failure",
				success: false,
			});
			expect(res2).toEqual({
				error: "Failed to create audit entry",
				success: false,
			});
		});
	});

	describe("listByEntity", () => {
		it("queries and returns entries matching entity", async () => {
			// Arrange
			const mockEntries = [
				{ action: "EDIT", entityId: "vod_1", entityType: "VOD", id: "1" },
			];
			const mockDb = {
				query: {
					auditEntries: {
						findMany: vi.fn().mockImplementation((options) => {
							if (options?.where) {
								options.where(
									{ entityId: "vod_1", entityType: "VOD" },
									{ and: vi.fn(), eq: vi.fn() },
								);
							}
							return Promise.resolve(mockEntries);
						}),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await auditService.listByEntity("VOD", "vod_1");

			// Assert
			expect(result).toEqual({
				data: mockEntries,
				success: true,
			});
		});

		it("delegates getAuditEntries to listByEntity", async () => {
			// Arrange
			const mockEntries = [
				{ action: "EDIT", entityId: "vod_1", entityType: "VOD", id: "1" },
			];
			const mockDb = {
				query: {
					auditEntries: {
						findMany: vi.fn().mockResolvedValue(mockEntries),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await getAuditEntries("VOD", "vod_1");

			// Assert
			expect(result).toEqual({
				data: mockEntries,
				success: true,
			});
		});

		it("returns dbFailure on error (Error and non-Error)", async () => {
			// Arrange
			vi.mocked(getDb)
				.mockRejectedValueOnce(new Error("Query failed"))
				.mockRejectedValueOnce("String error");

			// Act
			const res1 = await auditService.listByEntity("VOD", "vod_1");
			const res2 = await auditService.listByEntity("VOD", "vod_1");

			// Assert
			expect(res1).toEqual({
				error: "Query failed",
				success: false,
			});
			expect(res2).toEqual({
				error: "Failed to retrieve audit entries",
				success: false,
			});
		});
	});

	describe("listLogs", () => {
		it("filters by each option combination and returns paginated result", async () => {
			// Arrange
			const mockLogs = [
				{
					action: "CREATE",
					actor: { id: "usr_1", name: "Admin" },
					actorUserId: "usr_1",
					entityId: "vod_1",
					entityType: "VOD",
					id: "1",
				},
			];
			const mockDb = {
				query: {
					auditEntries: {
						findMany: vi.fn().mockImplementation((options) => {
							if (options?.where) {
								options.where(
									{
										actorUserId: "usr_1",
										entityId: "vod_1",
										entityType: "VOD",
									},
									{ and: vi.fn(), eq: vi.fn() },
								);
							}
							return Promise.resolve(mockLogs);
						}),
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
			const resAll = await auditService.listLogs({
				actorUserId: "usr_1",
				entityId: "vod_1",
				entityType: "VOD",
				page: 1,
				pageSize: 10,
			});
			const resType = await auditService.listLogs({ entityType: "VOD" });
			const resEntity = await auditService.listLogs({ entityId: "vod_1" });
			const resActor = await auditService.listLogs({ actorUserId: "usr_1" });
			const resNone = await getAuditLogs({});

			// Assert
			expect(resAll).toEqual({
				data: {
					items: mockLogs,
					page: 1,
					pageSize: 10,
					total: 1,
					totalPages: 1,
				},
				success: true,
			});
			expect(resType).toEqual({
				data: {
					items: mockLogs,
					page: 1,
					pageSize: 10,
					total: 1,
					totalPages: 1,
				},
				success: true,
			});
			expect(resEntity).toEqual({
				data: {
					items: mockLogs,
					page: 1,
					pageSize: 10,
					total: 1,
					totalPages: 1,
				},
				success: true,
			});
			expect(resActor).toEqual({
				data: {
					items: mockLogs,
					page: 1,
					pageSize: 10,
					total: 1,
					totalPages: 1,
				},
				success: true,
			});
			expect(resNone).toEqual({
				data: {
					items: mockLogs,
					page: 1,
					pageSize: 10,
					total: 1,
					totalPages: 1,
				},
				success: true,
			});
		});

		it("handles empty results and calculates totalPages >= 1", async () => {
			// Arrange
			const mockDb = {
				query: {
					auditEntries: {
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
			const result = await auditService.listLogs();

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

		it("returns dbFailure on error (Error and non-Error)", async () => {
			// Arrange
			vi.mocked(getDb)
				.mockRejectedValueOnce(new Error("Audit log fetch error"))
				.mockRejectedValueOnce("String error");

			// Act
			const res1 = await auditService.listLogs();
			const res2 = await auditService.listLogs();

			// Assert
			expect(res1).toEqual({
				error: "Audit log fetch error",
				success: false,
			});
			expect(res2).toEqual({
				error: "Failed to retrieve audit logs",
				success: false,
			});
		});

		it("delegates list to listLogs", async () => {
			// Arrange
			const mockLogs = [{ action: "LOGIN", id: "1" }];
			const mockDb = {
				query: {
					auditEntries: {
						findMany: vi.fn().mockResolvedValue(mockLogs),
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
			const result = await auditService.list();

			// Assert
			expect(result).toEqual({
				data: {
					items: mockLogs,
					page: 1,
					pageSize: 10,
					total: 1,
					totalPages: 1,
				},
				success: true,
			});
		});
	});
});
