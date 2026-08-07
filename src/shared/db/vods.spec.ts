import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "./client";
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

			vi.mocked(prisma.vod.findMany).mockResolvedValueOnce(mockVods as never);

			const result = await getPublishedVods();

			expect(prisma.vod.findMany).toHaveBeenCalledWith({
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
		it("fetches a published VOD by ID with ordered scenarios by default", async () => {
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

			vi.mocked(prisma.vod.findFirst).mockResolvedValueOnce(mockVod as never);

			const result = await getVodById("vod_1");

			expect(prisma.vod.findFirst).toHaveBeenCalledWith({
				include: {
					scenarios: {
						orderBy: { timestampSeconds: "asc" },
					},
				},
				where: { id: "vod_1", isPublished: true },
			});
			expect(result).toEqual(mockVod);
		});

		it("allows fetching unpublished VOD when publishedOnly is false", async () => {
			const mockDraftVod = {
				createdAt: new Date("2026-08-06T10:00:00Z"),
				durationSeconds: 600,
				id: "draft_vod",
				isPublished: false,
				mapName: "Eichenwalde",
				rankTier: "Master",
				scenarios: [],
				title: "Draft VOD",
				youtubeVideoId: "abc12345",
			};

			vi.mocked(prisma.vod.findFirst).mockResolvedValueOnce(
				mockDraftVod as never,
			);

			const result = await getVodById("draft_vod", { publishedOnly: false });

			expect(prisma.vod.findFirst).toHaveBeenCalledWith({
				include: {
					scenarios: {
						orderBy: { timestampSeconds: "asc" },
					},
				},
				where: { id: "draft_vod" },
			});
			expect(result).toEqual(mockDraftVod);
		});

		it("returns null if VOD is not found", async () => {
			vi.mocked(prisma.vod.findFirst).mockResolvedValueOnce(null);

			const result = await getVodById("non_existent");

			expect(prisma.vod.findFirst).toHaveBeenCalledWith({
				include: {
					scenarios: {
						orderBy: { timestampSeconds: "asc" },
					},
				},
				where: { id: "non_existent", isPublished: true },
			});
			expect(result).toBeNull();
		});
	});
});
