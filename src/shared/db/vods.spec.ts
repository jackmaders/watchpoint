import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "./client";
import { getPublishedVods, getVodById } from "./vods";

vi.mock("./client");

describe("VOD database accessors", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("getPublishedVods", () => {
		it("fetches all published VODs ordered by creation date descending", async () => {
			const mockVods = [
				{
					_count: { scenarios: 5 },
					createdAt: new Date("2026-08-06T10:00:00Z"),
					durationSeconds: 1080,
					id: "vod_1",
					isPublished: true,
					mapName: "King's Row",
					rankTier: "Grandmaster",
					title: "GM Ana VOD",
					youtubeVideoId: "dQw4w9WgXcQ",
				},
			];

			vi.mocked(db.vod.findMany).mockResolvedValueOnce(mockVods as never);

			const result = await getPublishedVods();

			expect(db.vod.findMany).toHaveBeenCalledWith({
				include: {
					_count: {
						select: { scenarios: true },
					},
				},
				orderBy: { createdAt: "desc" },
				where: { isPublished: true },
			});
			expect(result).toEqual(mockVods);
		});
	});

	describe("getVodById", () => {
		it("fetches a published VOD by ID with ordered scenarios", async () => {
			const mockVod = {
				createdAt: new Date("2026-08-06T10:00:00Z"),
				durationSeconds: 1080,
				id: "vod_1",
				isPublished: true,
				mapName: "King's Row",
				rankTier: "Grandmaster",
				scenarios: [
					{
						explanationText: "Explanation 1",
						id: "sc_1",
						inputConfig: { options: [] },
						inputType: "MULTIPLE_CHOICE",
						moduleType: "STRATEGY",
						promptText: "Prompt 1",
						timeLimitSeconds: null,
						timestampSeconds: 120.0,
						vodId: "vod_1",
					},
				],
				title: "GM Ana VOD",
				youtubeVideoId: "dQw4w9WgXcQ",
			};

			vi.mocked(db.vod.findUnique).mockResolvedValueOnce(mockVod as never);

			const result = await getVodById("vod_1");

			expect(db.vod.findUnique).toHaveBeenCalledWith({
				include: {
					scenarios: {
						orderBy: { timestampSeconds: "asc" },
					},
				},
				where: { id: "vod_1" },
			});
			expect(result).toEqual(mockVod);
		});

		it("returns null if VOD is not found", async () => {
			vi.mocked(db.vod.findUnique).mockResolvedValueOnce(null);

			const result = await getVodById("non_existent");

			expect(db.vod.findUnique).toHaveBeenCalledWith({
				include: {
					scenarios: {
						orderBy: { timestampSeconds: "asc" },
					},
				},
				where: { id: "non_existent" },
			});
			expect(result).toBeNull();
		});
	});
});
