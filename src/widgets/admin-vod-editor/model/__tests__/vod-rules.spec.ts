/**
 * Tests business rules for administrative VOD management.
 *
 * Verifies create, update, delete, publishing status, and bulk operations with discriminated unions.
 */

import { describe, expect, it, vi } from "vitest";
import * as dbQueries from "@/shared/db";
import * as validationModule from "../validation";
import {
	bulkDeleteVodsRule,
	bulkPublishVodsRule,
	createVodRule,
	deleteVodRule,
	setVodPublicationStatusRule,
	updateVodRule,
} from "../vod-rules";

describe("vod-rules", () => {
	const sampleVod = {
		createdAt: new Date(),
		durationSeconds: 600,
		heroName: "Ana",
		id: "vod-1",
		isPublished: false,
		mapName: "Dorado",
		rankTier: "Diamond",
		role: "SUPPORT" as const,
		title: "Ana VOD",
		youtubeVideoId: "yt-ana-1",
	};

	const sampleAuditEntry = {
		action: "AUDIT",
		actorUserId: "admin-1",
		createdAt: new Date(),
		entityId: "vod-1",
		entityType: "VOD",
		id: "audit-1",
		metadata: {},
	};

	describe("createVodRule", () => {
		it("rejects when isPublished is true on creation", async () => {
			// Act
			const result = await createVodRule({
				...sampleVod,
				isPublished: true,
			} as unknown as Parameters<typeof createVodRule>[0]);

			// Assert
			expect(result).toEqual({
				reason: "Cannot publish a VOD with zero scenarios",
				status: "rejected",
			});
		});

		it("creates VOD successfully and creates audit log", async () => {
			// Arrange
			const mockDb = {} as unknown as Parameters<typeof createVodRule>[1];
			vi.spyOn(dbQueries, "createVod").mockResolvedValueOnce(sampleVod);
			vi.spyOn(dbQueries, "createAuditEntry").mockResolvedValueOnce(
				sampleAuditEntry,
			);

			// Act
			const result = await createVodRule(
				{
					...sampleVod,
					actorUserId: "admin-1",
				},
				mockDb,
			);

			// Assert
			expect(result).toEqual({
				status: "success",
				vod: sampleVod,
			});
			expect(dbQueries.createAuditEntry).toHaveBeenCalledWith(
				expect.objectContaining({
					action: "VOD_CREATED",
					actorUserId: "admin-1",
					entityId: "vod-1",
				}),
				mockDb,
			);
		});

		it("returns rejected when db insert fails", async () => {
			// Arrange
			vi.spyOn(dbQueries, "createVod").mockResolvedValueOnce(
				undefined as unknown as typeof sampleVod,
			);

			// Act
			const result = await createVodRule(sampleVod);

			// Assert
			expect(result).toEqual({
				reason: "Failed to create VOD",
				status: "rejected",
			});
		});
	});

	describe("updateVodRule", () => {
		it("rejects when VOD is not found", async () => {
			// Arrange
			vi.spyOn(dbQueries, "getVodById").mockResolvedValueOnce(undefined);

			// Act
			const result = await updateVodRule({ id: "missing" });

			// Assert
			expect(result).toEqual({
				reason: "VOD not found",
				status: "rejected",
			});
		});

		it("rejects publication when validation fails", async () => {
			// Arrange
			vi.spyOn(dbQueries, "getVodById").mockResolvedValueOnce(sampleVod);
			vi.spyOn(dbQueries, "queryScenarios").mockResolvedValueOnce([]);
			vi.spyOn(
				validationModule,
				"validateVodForPublishing",
			).mockReturnValueOnce({
				error: "Cannot publish",
				valid: false,
			});

			// Act
			const result = await updateVodRule({ id: "vod-1", isPublished: true });

			// Assert
			expect(result).toEqual({
				reason: "Cannot publish",
				status: "rejected",
			});
		});

		it("rejects publication with fallback message when validation error is empty", async () => {
			// Arrange
			vi.spyOn(dbQueries, "getVodById").mockResolvedValueOnce(sampleVod);
			vi.spyOn(dbQueries, "queryScenarios").mockResolvedValueOnce([]);
			vi.spyOn(
				validationModule,
				"validateVodForPublishing",
			).mockReturnValueOnce({
				valid: false,
			});

			// Act
			const result = await updateVodRule({ id: "vod-1", isPublished: true });

			// Assert
			expect(result).toEqual({
				reason: "Invalid publishing state",
				status: "rejected",
			});
		});

		it("updates VOD successfully, logs audit, and returns success", async () => {
			// Arrange
			const updatedVod = { ...sampleVod, title: "New Title" };
			vi.spyOn(dbQueries, "getVodById").mockResolvedValueOnce(sampleVod);
			vi.spyOn(dbQueries, "queryScenarios").mockResolvedValueOnce([
				{
					explanationText: "exp",
					id: "s-1",
					imageUrl: null,
					inputConfig: {},
					inputType: "MULTIPLE_CHOICE",
					moduleType: "STRATEGY",
					promptText: "prompt",
					timeLimitSeconds: null,
					timestampSeconds: 10,
					vodId: "vod-1",
				},
			]);
			vi.spyOn(
				validationModule,
				"validateVodForPublishing",
			).mockReturnValueOnce({
				valid: true,
			});
			vi.spyOn(dbQueries, "updateVod").mockResolvedValueOnce(updatedVod);
			vi.spyOn(dbQueries, "createAuditEntry").mockResolvedValue(
				sampleAuditEntry,
			);

			// Act
			const result = await updateVodRule({
				actorUserId: "admin-1",
				durationSeconds: 300,
				heroName: "Ana",
				id: "vod-1",
				isPublished: true,
				mapName: "Dorado",
				rankTier: "Diamond",
				role: "SUPPORT",
				title: "New Title",
				youtubeVideoId: "yt-ana-1",
			});

			// Assert
			expect(result).toEqual({
				status: "success",
				vod: updatedVod,
			});
			expect(dbQueries.createAuditEntry).toHaveBeenCalledWith(
				expect.objectContaining({
					action: "VOD_PUBLISHED",
				}),
				undefined,
			);
			expect(dbQueries.createAuditEntry).toHaveBeenCalledWith(
				expect.objectContaining({
					action: "VOD_UPDATED",
				}),
				undefined,
			);
		});

		it("updates VOD to unpublished and records VOD_UNPUBLISHED audit log", async () => {
			// Arrange
			const publishedVod = { ...sampleVod, isPublished: true };
			const unpubVod = { ...sampleVod, isPublished: false };
			vi.spyOn(dbQueries, "getVodById").mockResolvedValueOnce(publishedVod);
			vi.spyOn(dbQueries, "updateVod").mockResolvedValueOnce(unpubVod);
			vi.spyOn(dbQueries, "createAuditEntry").mockResolvedValue(
				sampleAuditEntry,
			);

			// Act
			const result = await updateVodRule({
				actorUserId: "admin-1",
				id: "vod-1",
				isPublished: false,
			});

			// Assert
			expect(result).toEqual({
				status: "success",
				vod: unpubVod,
			});
			expect(dbQueries.createAuditEntry).toHaveBeenCalledWith(
				expect.objectContaining({
					action: "VOD_UNPUBLISHED",
				}),
				undefined,
			);
		});

		it("returns rejected when updateVod fails in db", async () => {
			// Arrange
			vi.spyOn(dbQueries, "getVodById").mockResolvedValueOnce(sampleVod);
			vi.spyOn(dbQueries, "updateVod").mockResolvedValueOnce(
				undefined as unknown as typeof sampleVod,
			);

			// Act
			const result = await updateVodRule({ id: "vod-1", title: "New" });

			// Assert
			expect(result).toEqual({
				reason: "Failed to update VOD",
				status: "rejected",
			});
		});
	});

	describe("deleteVodRule", () => {
		it("rejects when VOD is not found", async () => {
			// Arrange
			vi.spyOn(dbQueries, "getVodById").mockResolvedValueOnce(undefined);

			// Act
			const result = await deleteVodRule({ id: "missing" });

			// Assert
			expect(result).toEqual({
				reason: "VOD not found",
				status: "rejected",
			});
		});

		it("deletes VOD and records audit log", async () => {
			// Arrange
			vi.spyOn(dbQueries, "getVodById").mockResolvedValueOnce(sampleVod);
			vi.spyOn(dbQueries, "deleteVod").mockResolvedValueOnce(sampleVod);
			vi.spyOn(dbQueries, "createAuditEntry").mockResolvedValueOnce(
				sampleAuditEntry,
			);

			// Act
			const result = await deleteVodRule({
				actorUserId: "admin-1",
				id: "vod-1",
			});

			// Assert
			expect(result).toEqual({
				status: "success",
				vod: sampleVod,
			});
			expect(dbQueries.createAuditEntry).toHaveBeenCalledWith(
				expect.objectContaining({
					action: "VOD_DELETED",
				}),
				undefined,
			);
		});

		it("returns rejected when db delete fails", async () => {
			// Arrange
			vi.spyOn(dbQueries, "getVodById").mockResolvedValueOnce(sampleVod);
			vi.spyOn(dbQueries, "deleteVod").mockResolvedValueOnce(
				undefined as unknown as typeof sampleVod,
			);

			// Act
			const result = await deleteVodRule({ id: "vod-1" });

			// Assert
			expect(result).toEqual({
				reason: "Failed to delete VOD",
				status: "rejected",
			});
		});
	});

	describe("setVodPublicationStatusRule", () => {
		it("calls updateVodRule with isPublished", async () => {
			// Arrange
			vi.spyOn(dbQueries, "getVodById").mockResolvedValueOnce(sampleVod);
			vi.spyOn(dbQueries, "updateVod").mockResolvedValueOnce({
				...sampleVod,
				isPublished: false,
			});

			// Act
			const result = await setVodPublicationStatusRule({
				id: "vod-1",
				isPublished: false,
			});

			// Assert
			expect(result.status).toBe("success");
		});
	});

	describe("bulkPublishVodsRule", () => {
		it("tracks successes and failures for each id", async () => {
			// Arrange
			vi.spyOn(dbQueries, "getVodById")
				.mockResolvedValueOnce(sampleVod)
				.mockResolvedValueOnce(undefined);
			vi.spyOn(dbQueries, "updateVod").mockResolvedValueOnce({
				...sampleVod,
				isPublished: false,
			});

			// Act
			const result = await bulkPublishVodsRule({
				ids: ["vod-1", "vod-2"],
				isPublished: false,
			});

			// Assert
			expect(result).toEqual({
				result: {
					failed: [{ error: "VOD not found", id: "vod-2" }],
					succeeded: ["vod-1"],
				},
				status: "success",
			});
		});
	});

	describe("bulkDeleteVodsRule", () => {
		it("tracks successes and failures for each id", async () => {
			// Arrange
			vi.spyOn(dbQueries, "getVodById")
				.mockResolvedValueOnce(sampleVod)
				.mockResolvedValueOnce(undefined);
			vi.spyOn(dbQueries, "deleteVod").mockResolvedValueOnce(sampleVod);

			// Act
			const result = await bulkDeleteVodsRule({
				ids: ["vod-1", "vod-2"],
			});

			// Assert
			expect(result).toEqual({
				result: {
					failed: [{ error: "VOD not found", id: "vod-2" }],
					succeeded: ["vod-1"],
				},
				status: "success",
			});
		});
	});
});
