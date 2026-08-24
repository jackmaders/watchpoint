import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "../../client/client";
import { createAuditEntry, getAuditEntries, getAuditLogs } from "../repository";

vi.mock("../../client/client");

describe("audit repository", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("createAuditEntry inserts and returns audit entry with optional fields omitted", async () => {
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
		const result = await createAuditEntry({
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

	it("createAuditEntry handles empty returning array", async () => {
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
			data: null,
			success: true,
		});
	});

	it("createAuditEntry handles non-Error exception", async () => {
		// Arrange
		vi.mocked(getDb).mockRejectedValue("D1 insert string failure");

		// Act
		const result = await createAuditEntry({
			action: "FAIL_ACTION",
			entityId: "ent_fail",
			entityType: "VOD",
		});

		// Assert
		expect(result).toEqual({
			error: "Failed to create audit entry",
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

	it("getAuditEntries returns dbFailure on error (Error and non-Error)", async () => {
		// Arrange
		vi.mocked(getDb)
			.mockRejectedValueOnce(new Error("Query failed"))
			.mockRejectedValueOnce("String error");

		// Act
		const res1 = await getAuditEntries("VOD", "vod_1");
		const res2 = await getAuditEntries("VOD", "vod_1");

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

	it("getAuditLogs filters by each option combination", async () => {
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
		const resAll = await getAuditLogs({
			actorUserId: "usr_1",
			entityId: "vod_1",
			entityType: "VOD",
			limit: 10,
			offset: 0,
		});
		const resType = await getAuditLogs({ entityType: "VOD" });
		const resEntity = await getAuditLogs({ entityId: "vod_1" });
		const resActor = await getAuditLogs({ actorUserId: "usr_1" });
		const resNone = await getAuditLogs({});

		// Assert
		expect(resAll).toEqual({ data: mockLogs, success: true });
		expect(resType).toEqual({ data: mockLogs, success: true });
		expect(resEntity).toEqual({ data: mockLogs, success: true });
		expect(resActor).toEqual({ data: mockLogs, success: true });
		expect(resNone).toEqual({ data: mockLogs, success: true });
	});

	it("getAuditLogs returns dbFailure on error (Error and non-Error)", async () => {
		// Arrange
		vi.mocked(getDb)
			.mockRejectedValueOnce(new Error("Audit log fetch error"))
			.mockRejectedValueOnce("String error");

		// Act
		const res1 = await getAuditLogs();
		const res2 = await getAuditLogs();

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
});
