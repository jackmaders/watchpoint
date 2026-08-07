import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "../client/client";
import { getPublishedVods, getVodById } from "./vods";

vi.mock("../client/client");

describe("VOD database accessors", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("getPublishedVods", () => {
		it("fetches all published VODs ordered by creation date descending", async () => {
			const db = await getDb();
			const mockVods = [
				{
					createdAt: new Date("2026-08-06T10:00:00Z"),
					durationSeconds: 1080,
					id: "vod_1",
					isPublished: true,
					mapName: "King's Row",
					rankTier: "Grandmaster",
					scenarios: [{ id: "sc_1" }],
					title: "GM Ana VOD",
					youtubeVideoId: "dQw4w9WgXcQ",
				},
			];

			vi.mocked(db.query.vods.findMany).mockResolvedValueOnce(
				mockVods as never,
			);

			const result = await getPublishedVods();

			expect(db.query.vods.findMany).toHaveBeenCalled();
			expect(result).toEqual(mockVods);

			const options = vi.mocked(db.query.vods.findMany).mock.calls[0][0] as {
				where?: (vods: unknown, ops: { eq: ReturnType<typeof vi.fn> }) => void;
			};
			options?.where?.({}, { eq: vi.fn() });
		});
	});

	describe("getVodById", () => {
		it("fetches a published VOD by ID with ordered scenarios by default", async () => {
			const db = await getDb();
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

			vi.mocked(db.query.vods.findFirst).mockResolvedValueOnce(
				mockVod as never,
			);

			const result = await getVodById("vod_1");

			expect(db.query.vods.findFirst).toHaveBeenCalled();
			expect(result).toEqual(mockVod);

			const options = vi.mocked(db.query.vods.findFirst).mock.calls[0][0] as {
				where?: (
					vods: unknown,
					ops: { and: ReturnType<typeof vi.fn>; eq: ReturnType<typeof vi.fn> },
				) => void;
				with?: {
					scenarios?: {
						orderBy?: (
							scenarios: unknown,
							ops: { asc: ReturnType<typeof vi.fn> },
						) => void;
					};
				};
			};
			options?.where?.({}, { and: vi.fn(), eq: vi.fn() });
			options?.with?.scenarios?.orderBy?.({}, { asc: vi.fn() });
		});

		it("allows fetching unpublished VOD when publishedOnly is false", async () => {
			const db = await getDb();
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

			vi.mocked(db.query.vods.findFirst).mockResolvedValueOnce(
				mockDraftVod as never,
			);

			const result = await getVodById("draft_vod", { publishedOnly: false });

			expect(db.query.vods.findFirst).toHaveBeenCalled();
			expect(result).toEqual(mockDraftVod);

			const options = vi.mocked(db.query.vods.findFirst).mock.calls[0][0] as {
				where?: (vods: unknown, ops: { eq: ReturnType<typeof vi.fn> }) => void;
			};
			options?.where?.({}, { eq: vi.fn() });
		});

		it("returns undefined if VOD is not found", async () => {
			const db = await getDb();
			vi.mocked(db.query.vods.findFirst).mockResolvedValueOnce(
				undefined as never,
			);

			const result = await getVodById("non_existent");

			expect(db.query.vods.findFirst).toHaveBeenCalled();
			expect(result).toBeUndefined();
		});
	});
});
