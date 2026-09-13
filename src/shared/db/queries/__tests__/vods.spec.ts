/**
 * Tests direct domain query functions for the vods table.
 *
 * Verifies standard list queries with pagination and filtering, primary key lookups,
 * inserts, updates, deletions, and bulk operations using Drizzle 1.0 conventions.
 */

import { describe, expect, it } from "vitest";
import {
	bulkDeleteVods,
	bulkPublishVods,
	createVod,
	deleteVod,
	getVodById,
	queryVods,
	updateVod,
} from "../vods";

describe("vods domain queries", () => {
	it("executes queryVods with default limit and filtering", async () => {
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
									return Promise.resolve([{ id: "vod-1", title: "Test VOD" }]);
								},
							}),
						}),
					}),
				}),
			}),
		} as unknown as Parameters<typeof queryVods>[1];

		// Act
		const result = await queryVods({ limit: 25 }, mockDb);

		// Assert
		expect(result).toEqual([{ id: "vod-1", title: "Test VOD" }]);
		expect(capturedSelect).toEqual(expect.objectContaining({ limitCount: 25 }));
	});

	it("executes createVod and returns inserted record", async () => {
		// Arrange
		const newVod = {
			createdAt: new Date(),
			durationSeconds: 600,
			heroName: "Tracer",
			id: "vod-1",
			isPublished: false,
			mapName: "King's Row",
			rankTier: "Grandmaster",
			role: "DAMAGE" as const,
			title: "Tracer Guide",
			youtubeVideoId: "yt-123",
		};
		const mockDb = {
			insert: () => ({
				values: (vals: unknown) => ({
					returning: () => ({
						get: () => Promise.resolve(vals),
					}),
				}),
			}),
		} as unknown as Parameters<typeof createVod>[1];

		// Act
		const result = await createVod(newVod, mockDb);

		// Assert
		expect(result).toEqual(newVod);
	});

	it("executes getVodById returning matching row", async () => {
		// Arrange
		const mockDb = {
			select: () => ({
				from: () => ({
					where: () => ({
						get: () => Promise.resolve({ id: "vod-123", title: "Ana VOD" }),
					}),
				}),
			}),
		} as unknown as Parameters<typeof getVodById>[1];

		// Act
		const result = await getVodById("vod-123", mockDb);

		// Assert
		expect(result).toEqual({ id: "vod-123", title: "Ana VOD" });
	});

	it("executes updateVod and returns updated row", async () => {
		// Arrange
		const updatedRow = {
			id: "vod-123",
			title: "Updated Title",
		};
		const mockDb = {
			update: () => ({
				set: () => ({
					where: () => ({
						returning: () => ({
							get: () => Promise.resolve(updatedRow),
						}),
					}),
				}),
			}),
		} as unknown as Parameters<typeof updateVod>[2];

		// Act
		const result = await updateVod(
			"vod-123",
			{ title: "Updated Title" },
			mockDb,
		);

		// Assert
		expect(result).toEqual(updatedRow);
	});

	it("executes deleteVod and returns deleted row", async () => {
		// Arrange
		const mockDb = {
			delete: () => ({
				where: () => ({
					returning: () => ({
						get: () => Promise.resolve({ id: "vod-123" }),
					}),
				}),
			}),
		} as unknown as Parameters<typeof deleteVod>[1];

		// Act
		const result = await deleteVod("vod-123", mockDb);

		// Assert
		expect(result).toEqual({ id: "vod-123" });
	});

	it("executes bulkPublishVods with empty array returning empty result", async () => {
		// Act
		const result = await bulkPublishVods([], true);

		// Assert
		expect(result).toEqual([]);
	});

	it("executes bulkPublishVods with IDs returning updated rows", async () => {
		// Arrange
		const updatedRows = [
			{ id: "vod-1", isPublished: true },
			{ id: "vod-2", isPublished: true },
		];
		const mockDb = {
			update: () => ({
				set: () => ({
					where: () => ({
						returning: () => ({
							all: () => Promise.resolve(updatedRows),
						}),
					}),
				}),
			}),
		} as unknown as Parameters<typeof bulkPublishVods>[2];

		// Act
		const result = await bulkPublishVods(["vod-1", "vod-2"], true, mockDb);

		// Assert
		expect(result).toEqual(updatedRows);
	});

	it("executes bulkDeleteVods with empty array returning empty result", async () => {
		// Act
		const result = await bulkDeleteVods([]);

		// Assert
		expect(result).toEqual([]);
	});

	it("executes bulkDeleteVods with IDs returning deleted rows", async () => {
		// Arrange
		const deletedRows = [{ id: "vod-1" }, { id: "vod-2" }];
		const mockDb = {
			delete: () => ({
				where: () => ({
					returning: () => ({
						all: () => Promise.resolve(deletedRows),
					}),
				}),
			}),
		} as unknown as Parameters<typeof bulkDeleteVods>[1];

		// Act
		const result = await bulkDeleteVods(["vod-1", "vod-2"], mockDb);

		// Assert
		expect(result).toEqual(deletedRows);
	});
});
