import { describe, expect, it } from "vitest";
import { insertAuditEntrySchema, selectAuditEntrySchema } from "../audit";

describe("audit validation schemas", () => {
	it("validates valid audit entry insertion input", () => {
		// Arrange
		const input = {
			action: "VOD_CREATED",
			actorUserId: "user_123",
			entityId: "vod_456",
			entityType: "VOD",
			metadata: { title: "Test VOD" },
		};

		// Act
		const result = insertAuditEntrySchema.safeParse(input);

		// Assert
		expect(result.success).toBe(true);
	});

	it("rejects empty action, entityId, or entityType", () => {
		// Act & Assert
		expect(
			insertAuditEntrySchema.safeParse({
				action: "",
				entityId: "vod_456",
				entityType: "VOD",
			}).success,
		).toBe(false);

		expect(
			insertAuditEntrySchema.safeParse({
				action: "VOD_CREATED",
				entityId: "",
				entityType: "VOD",
			}).success,
		).toBe(false);

		expect(
			insertAuditEntrySchema.safeParse({
				action: "VOD_CREATED",
				entityId: "vod_456",
				entityType: "",
			}).success,
		).toBe(false);
	});

	it("validates selectAuditEntrySchema", () => {
		// Arrange
		const entry = {
			action: "VOD_CREATED",
			actorUserId: "user_123",
			createdAt: new Date(),
			entityId: "vod_456",
			entityType: "VOD",
			id: "audit_1",
			metadata: {},
		};

		// Act
		const result = selectAuditEntrySchema.safeParse(entry);

		// Assert
		expect(result.success).toBe(true);
	});
});
