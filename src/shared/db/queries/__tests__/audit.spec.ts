/**
 * Tests direct domain query functions for the audit entries table.
 *
 * Verifies standard list queries with pagination and filtering, primary key lookups,
 * inserts, and deletions using Drizzle 1.0 conventions.
 */

import { describe, expect, it } from "vitest";
import {
	createAuditEntry,
	deleteAuditEntry,
	getAuditEntryById,
	queryAuditEntries,
} from "../audit";

describe("audit domain queries", () => {
	it("executes queryAuditEntries with default limit and filtering", async () => {
		// Arrange
		let capturedSelect: unknown;
		const mockDb = {
			select: () => ({
				from: () => ({
					where: (whereClause: unknown) => ({
						orderBy: () => ({
							limit: (limitCount: number) => ({
								all: () => {
									capturedSelect = { limitCount, whereClause };
									return Promise.resolve([{ id: "test-id" }]);
								},
							}),
						}),
					}),
				}),
			}),
		} as unknown as Parameters<typeof queryAuditEntries>[1];

		// Act
		const result = await queryAuditEntries({ limit: 50 }, mockDb);

		// Assert
		expect(result).toEqual([{ id: "test-id" }]);
		expect(capturedSelect).toEqual(expect.objectContaining({ limitCount: 50 }));
	});

	it("executes createAuditEntry and returns inserted record", async () => {
		// Arrange
		const newEntry = {
			action: "CREATE",
			actorUserId: "user-1",
			createdAt: new Date(),
			entityId: "vod-1",
			entityType: "vod",
			id: "audit-1",
			metadata: {},
		};
		const mockDb = {
			insert: () => ({
				values: (vals: unknown) => ({
					returning: () => ({
						get: () => Promise.resolve(vals),
					}),
				}),
			}),
		} as unknown as Parameters<typeof createAuditEntry>[1];

		// Act
		const result = await createAuditEntry(newEntry, mockDb);

		// Assert
		expect(result).toEqual(newEntry);
	});

	it("executes getAuditEntryById returning matching row", async () => {
		// Arrange
		const mockDb = {
			select: () => ({
				from: () => ({
					where: () => ({
						get: () => Promise.resolve({ id: "audit-123" }),
					}),
				}),
			}),
		} as unknown as Parameters<typeof getAuditEntryById>[1];

		// Act
		const result = await getAuditEntryById("audit-123", mockDb);

		// Assert
		expect(result).toEqual({ id: "audit-123" });
	});

	it("executes deleteAuditEntry and returns deleted row", async () => {
		// Arrange
		const mockDb = {
			delete: () => ({
				where: () => ({
					returning: () => ({
						get: () => Promise.resolve({ id: "audit-123" }),
					}),
				}),
			}),
		} as unknown as Parameters<typeof deleteAuditEntry>[1];

		// Act
		const result = await deleteAuditEntry("audit-123", mockDb);

		// Assert
		expect(result).toEqual({ id: "audit-123" });
	});
});
