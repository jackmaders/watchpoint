import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "../../core/client";
import { auditService } from "../audit.service";

vi.mock("../../core/client");

describe("auditService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("count", () => {
		it("returns count of audit entries matching filters", async () => {
			// Arrange
			const mockDb = {
				select: vi.fn().mockReturnValue({
					from: vi.fn().mockReturnValue({
						where: vi.fn().mockResolvedValue([{ value: 5 }]),
					}),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await auditService.count({
				entityType: "VOD",
			});

			// Assert
			expect(result).toEqual({
				data: 5,
				success: true,
			});
		});

		it("returns count when options are omitted", async () => {
			// Arrange
			const mockDb = {
				select: vi.fn().mockReturnValue({
					from: vi.fn().mockReturnValue({
						where: vi.fn().mockResolvedValue([{ value: 12 }]),
					}),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await auditService.count();

			// Assert
			expect(result).toEqual({
				data: 12,
				success: true,
			});
		});

		it("defaults to 0 when count result row is empty", async () => {
			// Arrange
			const mockDb = {
				select: vi.fn().mockReturnValue({
					from: vi.fn().mockReturnValue({
						where: vi.fn().mockResolvedValue([]),
					}),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await auditService.count();

			// Assert
			expect(result).toEqual({
				data: 0,
				success: true,
			});
		});

		it("returns dbFailure when count query rejects", async () => {
			// Arrange
			const mockDb = {
				select: vi.fn().mockReturnValue({
					from: vi.fn().mockReturnValue({
						where: vi.fn().mockRejectedValue(new Error("Count failure")),
					}),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await auditService.count();

			// Assert
			expect(result).toEqual({
				error: "Count failure",
				success: false,
			});
		});
	});

	describe("create", () => {
		it("returns validation failure when input violates schema", async () => {
			// Act
			const result = await auditService.create({
				action: "",
				entityId: "ent_1",
				entityType: "VOD",
			});

			// Assert
			expect(result).toEqual({
				error: "Action is required",
				success: false,
			});
		});

		it("inserts and returns audit entry with valid input", async () => {
			// Arrange
			const mockEntry = {
				action: "TEST_ACTION",
				actorUserId: "usr_1",
				createdAt: new Date(),
				entityId: "ent_1",
				entityType: "VOD",
				id: "audit_1",
				metadata: { detail: "info" },
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
				actorUserId: "usr_1",
				entityId: "ent_1",
				entityType: "VOD",
				metadata: { detail: "info" },
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
			const result = await auditService.create({
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

		it("handles database execution errors", async () => {
			// Arrange
			const mockDb = {
				insert: vi.fn().mockReturnValue({
					values: vi.fn().mockReturnValue({
						returning: vi
							.fn()
							.mockRejectedValue(new Error("D1 insert failure")),
					}),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await auditService.create({
				action: "FAIL_ACTION",
				entityId: "ent_fail",
				entityType: "VOD",
			});

			// Assert
			expect(result).toEqual({
				error: "D1 insert failure",
				success: false,
			});
		});
	});

	describe("getById", () => {
		it("finds and returns audit entry by id with actor", async () => {
			// Arrange
			const mockEntry = {
				action: "VOD_CREATED",
				actor: { id: "usr_1", name: "Admin" },
				actorUserId: "usr_1",
				createdAt: new Date(),
				entityId: "vod_1",
				entityType: "VOD",
				id: "audit_1",
				metadata: {},
			};
			const mockDb = {
				query: {
					auditEntries: {
						findFirst: vi.fn().mockResolvedValue(mockEntry),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await auditService.getById({ id: "audit_1" });

			// Assert
			expect(result).toEqual({
				data: mockEntry,
				success: true,
			});
		});

		it("returns null when audit entry is not found", async () => {
			// Arrange
			const mockDb = {
				query: {
					auditEntries: {
						findFirst: vi.fn().mockResolvedValue(undefined),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await auditService.getById({ id: "non_existent" });

			// Assert
			expect(result).toEqual({
				data: null,
				success: true,
			});
		});

		it("handles database errors when querying by id", async () => {
			// Arrange
			const mockDb = {
				query: {
					auditEntries: {
						findFirst: vi
							.fn()
							.mockRejectedValue(new Error("Query lookup failed")),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await auditService.getById({ id: "audit_err" });

			// Assert
			expect(result).toEqual({
				error: "Query lookup failed",
				success: false,
			});
		});
	});

	describe("list", () => {
		it("filters by options and returns paginated result with actor", async () => {
			// Arrange
			const mockLogs = [
				{
					action: "CREATE",
					actor: { id: "usr_1", name: "Admin" },
					actorUserId: "usr_1",
					createdAt: new Date(),
					entityId: "vod_1",
					entityType: "VOD",
					id: "1",
					metadata: {},
				},
			];
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
			const result = await auditService.list({
				actorUserId: "usr_1",
				entityId: "vod_1",
				entityType: "VOD",
				page: 1,
				pageSize: 10,
			});

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

		it("handles default options when none are provided", async () => {
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
			const result = await auditService.list();

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

		it("returns failure when count query fails", async () => {
			// Arrange
			const mockDb = {
				select: vi.fn().mockReturnValue({
					from: vi.fn().mockReturnValue({
						where: vi.fn().mockRejectedValue(new Error("Count error")),
					}),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await auditService.list();

			// Assert
			expect(result).toEqual({
				error: "Count error",
				success: false,
			});
		});

		it("returns failure when findMany query fails", async () => {
			// Arrange
			const mockDb = {
				query: {
					auditEntries: {
						findMany: vi.fn().mockRejectedValue(new Error("findMany error")),
					},
				},
				select: vi.fn().mockReturnValue({
					from: vi.fn().mockReturnValue({
						where: vi.fn().mockResolvedValue([{ value: 10 }]),
					}),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await auditService.list();

			// Assert
			expect(result).toEqual({
				error: "findMany error",
				success: false,
			});
		});
	});
});
