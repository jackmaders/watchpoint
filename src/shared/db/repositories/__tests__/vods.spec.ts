import { beforeEach, describe, expect, it, vi } from "vitest";
import { type DbContext, getDb } from "../../client/client";
import {
	getPublishedVods,
	getSessionManifest,
	type SessionManifest,
} from "../vods";

vi.mock("../../client/client");

describe("VOD database accessors", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("getPublishedVods", () => {
		it("fetches all published VODs ordered by creation date descending", async () => {
			// Arrange
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

			// Act
			const result = await getPublishedVods();

			// Assert
			expect(db.query.vods.findMany).toHaveBeenCalled();
			expect(result).toEqual(mockVods);
		});

		it("passes custom db context when provided", async () => {
			// Arrange
			const db = await getDb();
			const mockContext = { env: { DB: {} } } as unknown as DbContext;
			vi.mocked(db.query.vods.findMany).mockResolvedValueOnce([]);

			// Act
			await getPublishedVods(mockContext);

			// Assert
			expect(getDb).toHaveBeenCalledWith(mockContext);
		});
	});

	describe("getSessionManifest", () => {
		it("fetches a published VOD session manifest by ID with ordered scenarios by default", async () => {
			// Arrange
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
				mockVod as unknown as SessionManifest,
			);

			// Act
			const result = await getSessionManifest("vod_1");

			// Assert
			expect(db.query.vods.findFirst).toHaveBeenCalled();
			expect(result).toEqual(mockVod);
		});

		it("passes custom db context when provided", async () => {
			// Arrange
			const db = await getDb();
			const mockContext = { env: { DB: {} } } as unknown as DbContext;
			vi.mocked(db.query.vods.findFirst).mockResolvedValueOnce(undefined);

			// Act
			await getSessionManifest("vod_1", {}, mockContext);

			// Assert
			expect(getDb).toHaveBeenCalledWith(mockContext);
		});

		it("allows fetching unpublished VOD session manifest when publishedOnly is false", async () => {
			// Arrange
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
				mockDraftVod as unknown as SessionManifest,
			);

			// Act
			const result = await getSessionManifest("draft_vod", {
				publishedOnly: false,
			});

			// Assert
			expect(db.query.vods.findFirst).toHaveBeenCalled();
			expect(result).toEqual(mockDraftVod);
		});

		it("returns null if VOD is not found", async () => {
			// Arrange
			const db = await getDb();
			vi.mocked(db.query.vods.findFirst).mockResolvedValueOnce(undefined);

			// Act
			const result = await getSessionManifest("non_existent");

			// Assert
			expect(db.query.vods.findFirst).toHaveBeenCalled();
			expect(result).toBeNull();
		});

		it("filters scenarios by moduleType when normalized modules are provided", async () => {
			// Arrange
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
						moduleType: "TACTICS",
						timestampSeconds: 150,
					},
				],
				title: "GM Ana VOD",
				youtubeVideoId: "dQw4w9WgXcQ",
			};

			vi.mocked(db.query.vods.findFirst).mockResolvedValueOnce(
				mockVod as unknown as SessionManifest,
			);

			// Act
			const result = await getSessionManifest("vod_1", {
				modules: ["STRATEGY", "TACTICS"],
			});
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

			// Assert
			expect(result).toEqual(mockVod);
			expect(mockInArray).toHaveBeenCalledWith("STRATEGY", [
				"STRATEGY",
				"TACTICS",
			]);
		});

		it("filters scenarios when normalized modules contain multiple module types", async () => {
			// Arrange
			const db = await getDb();
			vi.mocked(db.query.vods.findFirst).mockResolvedValueOnce({
				id: "vod_1",
				scenarios: [],
			} as unknown as SessionManifest);

			// Act
			await getSessionManifest("vod_1", {
				modules: ["ULTIMATE", "COOLDOWN"],
			});
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
			const mockScenarios = { moduleType: "ULTIMATE" };
			if (typeof capturedWhereFn === "function") {
				capturedWhereFn(
					mockScenarios as unknown as Parameters<typeof capturedWhereFn>[0],
					{ inArray: mockInArray } as unknown as Parameters<
						typeof capturedWhereFn
					>[1],
				);
			}

			// Assert
			expect(mockInArray).toHaveBeenCalledWith("ULTIMATE", [
				"ULTIMATE",
				"COOLDOWN",
			]);
		});

		it("filters scenarios when normalized modules are passed as a readonly array", async () => {
			// Arrange
			const db = await getDb();
			vi.mocked(db.query.vods.findFirst).mockResolvedValueOnce({
				id: "vod_1",
				scenarios: [],
			} as unknown as SessionManifest);
			// Act
			await getSessionManifest("vod_1", {
				modules: ["SPATIAL", "STRATEGY", "TACTICS"],
			});
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
			const mockScenarios = { moduleType: "SPATIAL" };
			if (typeof capturedWhereFn === "function") {
				capturedWhereFn(
					mockScenarios as unknown as Parameters<typeof capturedWhereFn>[0],
					{ inArray: mockInArray } as unknown as Parameters<
						typeof capturedWhereFn
					>[1],
				);
			}

			// Assert
			expect(mockInArray).toHaveBeenCalledWith("SPATIAL", [
				"SPATIAL",
				"STRATEGY",
				"TACTICS",
			]);
		});

		it("does not apply scenario filter when no normalized modules are provided", async () => {
			// Arrange
			const db = await getDb();
			vi.mocked(db.query.vods.findFirst).mockResolvedValueOnce({
				id: "vod_1",
				scenarios: [],
			} as unknown as SessionManifest);

			// Act
			await getSessionManifest("vod_1");
			await getSessionManifest("vod_1", {
				modules: [],
			});
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

			// Assert
			expect(capturedWhereFn).toBeUndefined();
		});

		it("produces empty match condition when normalized modules are null", async () => {
			// Arrange
			const db = await getDb();
			vi.mocked(db.query.vods.findFirst).mockResolvedValueOnce({
				id: "vod_1",
				scenarios: [],
			} as unknown as SessionManifest);

			// Act
			await getSessionManifest("vod_1", {
				modules: null,
			});
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

			const mockSql = vi.fn().mockReturnValue("1 = 0");
			const mockScenarios = { moduleType: "STRATEGY" };
			if (typeof capturedWhereFn === "function") {
				capturedWhereFn(
					mockScenarios as unknown as Parameters<typeof capturedWhereFn>[0],
					{ sql: mockSql } as unknown as Parameters<typeof capturedWhereFn>[1],
				);
			}

			// Assert
			expect(mockSql).toHaveBeenCalled();
		});
	});
});
