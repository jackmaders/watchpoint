import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "../client/client";
import { getPublishedVods, getVodById, getVodManifest } from "./vods";

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
				mockVods as unknown as Awaited<ReturnType<typeof getPublishedVods>>,
			);

			const result = await getPublishedVods();

			expect(db.query.vods.findMany).toHaveBeenCalled();
			expect(result).toEqual(mockVods);
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
				mockVod as unknown as Awaited<ReturnType<typeof getVodById>>,
			);

			const result = await getVodById("vod_1");

			expect(db.query.vods.findFirst).toHaveBeenCalled();
			expect(result).toEqual(mockVod);
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
				mockDraftVod as unknown as Awaited<ReturnType<typeof getVodById>>,
			);

			const result = await getVodById("draft_vod", { publishedOnly: false });

			expect(db.query.vods.findFirst).toHaveBeenCalled();
			expect(result).toEqual(mockDraftVod);
		});

		it("returns undefined if VOD is not found", async () => {
			const db = await getDb();
			vi.mocked(db.query.vods.findFirst).mockResolvedValueOnce(
				undefined as unknown as Awaited<ReturnType<typeof getVodById>>,
			);

			const result = await getVodById("non_existent");

			expect(db.query.vods.findFirst).toHaveBeenCalled();
			expect(result).toBeUndefined();
		});
	});

	describe("getVodManifest", () => {
		it("fetches VOD manifest with all scenarios when no module filter is provided", async () => {
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
						id: "sc_1",
						moduleType: "STRATEGY",
						timestampSeconds: 30,
					},
					{
						id: "sc_2",
						moduleType: "ULTIMATE",
						timestampSeconds: 90,
					},
				],
				title: "GM Ana VOD",
				youtubeVideoId: "dQw4w9WgXcQ",
			};

			vi.mocked(db.query.vods.findFirst).mockResolvedValueOnce(
				mockVod as unknown as Awaited<ReturnType<typeof getVodById>>,
			);

			const result = await getVodManifest("vod_1");

			expect(result).toEqual(mockVod);
		});

		it("filters scenarios by moduleType when modules option is provided", async () => {
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
						id: "sc_1",
						moduleType: "STRATEGY",
						timestampSeconds: 30,
					},
					{
						id: "sc_3",
						moduleType: "TACTICS",
						timestampSeconds: 150,
					},
				],
				title: "GM Ana VOD",
				youtubeVideoId: "dQw4w9WgXcQ",
			};

			vi.mocked(db.query.vods.findFirst).mockResolvedValueOnce(
				mockVod as unknown as Awaited<ReturnType<typeof getVodById>>,
			);

			const result = await getVodManifest("vod_1", {
				modules: ["STRATEGY", "TACTICS"],
			});

			expect(result?.scenarios).toHaveLength(2);
			expect(result?.scenarios.map((s) => s.id)).toEqual(["sc_1", "sc_3"]);
		});

		it("returns null if VOD is not found", async () => {
			const db = await getDb();
			vi.mocked(db.query.vods.findFirst).mockResolvedValueOnce(
				undefined as unknown as Awaited<ReturnType<typeof getVodById>>,
			);

			const result = await getVodManifest("non_existent");

			expect(result).toBeNull();
		});

		it("queries unpublished VODs when publishedOnly is set to false", async () => {
			const db = await getDb();
			const mockVod = {
				createdAt: new Date("2026-08-06T10:00:00Z"),
				durationSeconds: 1080,
				id: "unpub_vod",
				isPublished: false,
				mapName: "Eichenwalde",
				rankTier: "Diamond",
				scenarios: [],
				title: "Unpublished VOD",
				youtubeVideoId: "abc123xyz",
			};

			vi.mocked(db.query.vods.findFirst).mockResolvedValueOnce(
				mockVod as unknown as Awaited<ReturnType<typeof getVodById>>,
			);

			const result = await getVodManifest("unpub_vod", {
				publishedOnly: false,
			});

			expect(result).toEqual(mockVod);
		});

		it("executes scenario module filtering callback", async () => {
			const db = await getDb();

			vi.mocked(db.query.vods.findFirst).mockResolvedValueOnce({
				id: "vod_1",
				scenarios: [],
			} as unknown as Awaited<ReturnType<typeof getVodById>>);

			await getVodManifest("vod_1", { modules: ["STRATEGY"] });

			const callArgs = vi
				.mocked(db.query.vods.findFirst)
				.mock.calls.at(-1)?.[0];
			const capturedWhereFn =
				callArgs &&
				"with" in callArgs &&
				callArgs.with &&
				"scenarios" in callArgs.with &&
				typeof callArgs.with.scenarios === "object" &&
				callArgs.with.scenarios &&
				"where" in callArgs.with.scenarios
					? callArgs.with.scenarios.where
					: undefined;

			const mockInArray = vi.fn();
			const mockScenarios = { moduleType: "STRATEGY" };
			if (typeof capturedWhereFn === "function") {
				capturedWhereFn(
					mockScenarios as unknown as Parameters<typeof capturedWhereFn>[0],
					{ inArray: mockInArray } as unknown as Parameters<
						typeof capturedWhereFn
					>[1],
				);
			}

			expect(mockInArray).toHaveBeenCalledWith("STRATEGY", ["STRATEGY"]);
		});
	});
});
