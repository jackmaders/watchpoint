import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "../../client/client";
import { createAuditEntry, getAuditEntries, getAuditLogs } from "../repository";

vi.mock("../../client/client");

describe("audit repository", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("createAuditEntry inserts and returns audit entry", async () => {
		// Arrange
		const mockEntry = {
			action: "TEST_ACTION",
			actorUserId: "usr_1",
			createdAt: new Date(),
			entityId: "ent_1",
			entityType: "VOD",
			id: "audit_1",
			metadata: { note: "test" },
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
		const result = await createAuditEntry({
			action: "TEST_ACTION",
			actorUserId: "usr_1",
			entityId: "ent_1",
			entityType: "VOD",
			metadata: { note: "test" },
		});

		// Assert
		expect(result).toEqual({
			data: mockEntry,
			success: true,
		});
	});

	it("createAuditEntry handles database error gracefully", async () => {
		// Arrange
		vi.mocked(getDb).mockRejectedValue(new Error("D1 insert failure"));

		// Act
		const result = await createAuditEntry({
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

	it("getAuditEntries queries and returns entries matching entity", async () => {
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
		const result = await getAuditEntries("VOD", "vod_1");

		// Assert
		expect(result).toEqual({
			data: mockEntries,
			success: true,
		});
	});

	it("getAuditEntries returns dbFailure on error", async () => {
		// Arrange
		vi.mocked(getDb).mockRejectedValue(new Error("Query failed"));

		// Act
		const result = await getAuditEntries("VOD", "vod_1");

		// Assert
		expect(result).toEqual({
			error: "Query failed",
			success: false,
		});
	});

	it("getAuditLogs filters by options and returns logs with actor", async () => {
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
		};
		vi.mocked(getDb).mockResolvedValue(mockDb as never);

		// Act
		const result = await getAuditLogs({
			actorUserId: "usr_1",
			entityId: "vod_1",
			entityType: "VOD",
			limit: 10,
			offset: 0,
		});

		// Assert
		expect(result).toEqual({
			data: mockLogs,
			success: true,
		});
	});

	it("getAuditLogs handles no filter conditions", async () => {
		// Arrange
		const mockLogs: unknown[] = [];
		const mockDb = {
			query: {
				auditEntries: {
					findMany: vi.fn().mockImplementation((options) => {
						if (options?.where) {
							options.where({}, { and: vi.fn(), eq: vi.fn() });
						}
						return Promise.resolve(mockLogs);
					}),
				},
			},
		};
		vi.mocked(getDb).mockResolvedValue(mockDb as never);

		// Act
		const result = await getAuditLogs({});

		// Assert
		expect(result).toEqual({
			data: mockLogs,
			success: true,
		});
	});

	it("getAuditLogs returns dbFailure on error", async () => {
		// Arrange
		vi.mocked(getDb).mockRejectedValue(new Error("Audit log fetch error"));

		// Act
		const result = await getAuditLogs();

		// Assert
		expect(result).toEqual({
			error: "Audit log fetch error",
			success: false,
		});
	});
});
