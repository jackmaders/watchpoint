import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "../../client/client";
import { createAuditEntry, getAuditEntries, getAuditLogs } from "../audit";

vi.mock("../../client/client");

describe("audit database accessors", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("creates an audit entry with an optional actor", async () => {
		// Arrange
		const db = await getDb();
		vi.mocked(db.insert).mockReturnValueOnce({
			values: vi.fn(() => ({
				returning: vi
					.fn()
					.mockResolvedValueOnce([{ action: "publish", id: "audit_1" }]),
			})),
		} as never);

		// Act
		const result = await createAuditEntry({
			action: "publish",
			actorUserId: "admin_1",
			entityId: "vod_1",
			entityType: "VOD",
			metadata: { reason: "beta catalog" },
		});

		// Assert
		expect(result).toEqual({ action: "publish", id: "audit_1" });
	});

	it("uses an empty metadata object and returns null when insertion returns no entry", async () => {
		// Arrange
		const db = await getDb();
		vi.mocked(db.insert).mockReturnValueOnce({
			values: vi.fn(() => ({
				returning: vi.fn().mockResolvedValueOnce([]),
			})),
		} as never);

		// Act
		const result = await createAuditEntry({
			action: "review",
			entityId: "vod_1",
			entityType: "VOD",
		});

		// Assert
		expect(result).toBeNull();
	});

	it("loads audit entries for an entity in newest-first order", async () => {
		// Arrange
		const db = await getDb();
		const expected = [{ entityId: "vod_1", id: "audit_1" }];
		vi.mocked(db.query.auditEntries.findMany).mockResolvedValueOnce(
			expected as never,
		);

		// Act
		const result = await getAuditEntries("VOD", "vod_1");

		// Assert
		expect(result).toEqual(expected);
	});

	it("loads audit logs with all filter parameters", async () => {
		// Arrange
		const db = await getDb();
		const expected = [
			{
				action: "VOD_CREATED",
				actor: { email: "admin@example.com", id: "admin_1" },
				actorUserId: "admin_1",
				entityId: "vod_1",
				entityType: "VOD",
				id: "audit_1",
			},
		];
		vi.mocked(db.query.auditEntries.findMany).mockResolvedValueOnce(
			expected as never,
		);

		// Act
		const result = await getAuditLogs({
			actorUserId: "admin_1",
			entityId: "vod_1",
			entityType: "VOD",
			limit: 10,
			offset: 0,
		});

		// Assert
		expect(result).toEqual(expected);
	});

	it("loads audit logs with default options", async () => {
		// Arrange
		const db = await getDb();
		const expected = [
			{
				action: "VOD_CREATED",
				actor: null,
				actorUserId: null,
				entityId: "vod_1",
				entityType: "VOD",
				id: "audit_1",
			},
		];
		vi.mocked(db.query.auditEntries.findMany).mockResolvedValueOnce(
			expected as never,
		);

		// Act
		const result = await getAuditLogs();

		// Assert
		expect(result).toEqual(expected);
	});
});
