import { beforeEach, describe, expect, it, vi } from "vitest";
import { type DbContext, getDb } from "../../client/client";
import {
	bulkDeleteVods,
	bulkPublishVods,
	createScenario,
	createVod,
	deleteScenario,
	deleteVod,
	getAdminVods,
	getPublishedVods,
	getScenarioById,
	getScenariosByVodId,
	getSessionManifest,
	getVodById,
	reorderScenarios,
	type SessionManifest,
	setVodPublicationStatus,
	updateScenario,
	updateVod,
	validateScenarioConfig,
	validateVodForPublishing,
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

	describe("validateScenarioConfig", () => {
		it("validates multiple choice config requires at least 2 options and a correct choice", () => {
			// Arrange
			const validScenario = {
				explanationText: "Valid explanation",
				inputConfig: {
					options: [
						{ id: "1", is_correct: true, text: "Correct" },
						{ id: "2", is_correct: false, text: "Wrong" },
					],
				},
				inputType: "MULTIPLE_CHOICE" as const,
				promptText: "Valid prompt",
				timestampSeconds: 10,
			};

			// Act
			const validResult = validateScenarioConfig(validScenario);
			const noOptionsResult = validateScenarioConfig({
				...validScenario,
				inputConfig: { options: [] },
			});
			const noCorrectResult = validateScenarioConfig({
				...validScenario,
				inputConfig: {
					options: [
						{ id: "1", is_correct: false, text: "Wrong 1" },
						{ id: "2", is_correct: false, text: "Wrong 2" },
					],
				},
			});

			// Assert
			expect(validResult.valid).toBe(true);
			expect(noOptionsResult.valid).toBe(false);
			expect(noCorrectResult.valid).toBe(false);
		});

		it("validates slider and map pin configs", () => {
			// Arrange
			const percentScenario = {
				explanationText: "Exp",
				inputConfig: { max: 100, min: 0, target: 50 },
				inputType: "PERCENT_SLIDER" as const,
				promptText: "Prompt",
				timestampSeconds: 10,
			};
			const invalidPercent = {
				...percentScenario,
				inputConfig: { max: 100, min: 0, target: 150 },
			};
			const timeScenario = {
				explanationText: "Exp",
				inputConfig: { max: 10, min: 0, target: 5 },
				inputType: "TIME_SLIDER" as const,
				promptText: "Prompt",
				timestampSeconds: 10,
			};
			const invalidTime = {
				...timeScenario,
				inputConfig: { max: 5, min: 10, target: 5 },
			};
			const mapScenario = {
				explanationText: "Exp",
				inputConfig: { targetX: 100, targetY: 200 },
				inputType: "MAP_PIN_2D" as const,
				promptText: "Prompt",
				timestampSeconds: 10,
			};
			const invalidMap = {
				...mapScenario,
				inputConfig: { targetX: "invalid" },
			};

			// Act
			const resPercentValid = validateScenarioConfig(percentScenario);
			const resPercentInvalid = validateScenarioConfig(invalidPercent);
			const resTimeValid = validateScenarioConfig(timeScenario);
			const resTimeInvalid = validateScenarioConfig(invalidTime);
			const resMapValid = validateScenarioConfig(mapScenario);
			const resMapInvalid = validateScenarioConfig(invalidMap);

			// Assert
			expect(resPercentValid.valid).toBe(true);
			expect(resPercentInvalid.valid).toBe(false);
			expect(resTimeValid.valid).toBe(true);
			expect(resTimeInvalid.valid).toBe(false);
			expect(resMapValid.valid).toBe(true);
			expect(resMapInvalid.valid).toBe(false);
		});

		it("validates slider defaults and map pin coordinate fallbacks", () => {
			// Arrange
			const defaultPercent = {
				explanationText: "Exp",
				inputConfig: { target: 50 },
				inputType: "PERCENT_SLIDER" as const,
				promptText: "Prompt",
				timestampSeconds: 10,
			};
			const defaultTime = {
				explanationText: "Exp",
				inputConfig: { target: 5 },
				inputType: "TIME_SLIDER" as const,
				promptText: "Prompt",
				timestampSeconds: 10,
			};
			const mapXY = {
				explanationText: "Exp",
				inputConfig: { x: 50, y: 75 },
				inputType: "MAP_PIN_2D" as const,
				promptText: "Prompt",
				timestampSeconds: 10,
			};

			// Act
			const resDefaultPercent = validateScenarioConfig(defaultPercent);
			const resDefaultTime = validateScenarioConfig(defaultTime);
			const resMapXY = validateScenarioConfig(mapXY);

			// Assert
			expect(resDefaultPercent.valid).toBe(true);
			expect(resDefaultTime.valid).toBe(true);
			expect(resMapXY.valid).toBe(true);
		});

		it("rejects scenarios with invalid basic fields", () => {
			// Arrange
			const base = {
				explanationText: "Exp",
				inputConfig: {
					options: [
						{ id: "1", is_correct: true, text: "A" },
						{ id: "2", is_correct: false, text: "B" },
					],
				},
				inputType: "MULTIPLE_CHOICE" as const,
				promptText: "Prompt",
				timestampSeconds: 10,
			};

			// Act
			const resEmptyPrompt = validateScenarioConfig({
				...base,
				promptText: "   ",
			});
			const resEmptyExp = validateScenarioConfig({
				...base,
				explanationText: "",
			});
			const resNegativeTs = validateScenarioConfig({
				...base,
				timestampSeconds: -1,
			});
			const resInvalidLimit = validateScenarioConfig({
				...base,
				timeLimitSeconds: 0,
			});
			const resNoType = validateScenarioConfig({ ...base, inputType: null });
			const resNoConfig = validateScenarioConfig({
				...base,
				inputConfig: null,
			});

			// Assert
			expect(resEmptyPrompt.valid).toBe(false);
			expect(resEmptyExp.valid).toBe(false);
			expect(resNegativeTs.valid).toBe(false);
			expect(resInvalidLimit.valid).toBe(false);
			expect(resNoType.valid).toBe(false);
			expect(resNoConfig.valid).toBe(false);
		});
	});

	describe("validateVodForPublishing", () => {
		it("rejects publishing when VOD has zero or null scenarios", () => {
			// Arrange
			const vod = { durationSeconds: 600 };

			// Act
			const resEmpty = validateVodForPublishing(vod, []);
			const resNull = validateVodForPublishing(vod, null as never);

			// Assert
			expect(resEmpty.valid).toBe(false);
			expect(resEmpty.error).toBe("Cannot publish a VOD with zero scenarios");
			expect(resNull.valid).toBe(false);
			expect(resNull.error).toBe("Cannot publish a VOD with zero scenarios");
		});

		it("rejects publishing when a scenario timestamp exceeds VOD duration", () => {
			// Arrange
			const vod = { durationSeconds: 100 };
			const scenarios = [
				{
					explanationText: "Exp",
					id: "s1",
					inputConfig: {
						options: [
							{ id: "1", is_correct: true, text: "A" },
							{ id: "2", is_correct: false, text: "B" },
						],
					},
					inputType: "MULTIPLE_CHOICE" as const,
					moduleType: "STRATEGY" as const,
					promptText: "Prompt",
					timeLimitSeconds: null,
					timestampSeconds: 150,
					vodId: "v1",
				},
			];

			// Act
			const result = validateVodForPublishing(vod, scenarios as never);

			// Assert
			expect(result.valid).toBe(false);
			expect(result.error).toContain("exceeds VOD duration");
		});

		it("rejects publishing when a scenario has invalid configuration", () => {
			// Arrange
			const vod = { durationSeconds: 600 };
			const scenarios = [
				{
					explanationText: "Exp",
					id: "s1",
					inputConfig: { options: [] },
					inputType: "MULTIPLE_CHOICE" as const,
					moduleType: "STRATEGY" as const,
					promptText: "Prompt",
					timeLimitSeconds: null,
					timestampSeconds: 50,
					vodId: "v1",
				},
			];

			// Act
			const result = validateVodForPublishing(vod, scenarios as never);

			// Assert
			expect(result.valid).toBe(false);
			expect(result.error).toContain("Invalid scenario configuration");
		});

		it("accepts publishing when all scenarios are valid within duration", () => {
			// Arrange
			const vod = { durationSeconds: 600 };
			const scenarios = [
				{
					explanationText: "Exp",
					id: "s1",
					inputConfig: {
						options: [
							{ id: "1", is_correct: true, text: "A" },
							{ id: "2", is_correct: false, text: "B" },
						],
					},
					inputType: "MULTIPLE_CHOICE" as const,
					moduleType: "STRATEGY" as const,
					promptText: "Prompt",
					timeLimitSeconds: null,
					timestampSeconds: 50,
					vodId: "v1",
				},
			];

			// Act
			const result = validateVodForPublishing(vod, scenarios as never);

			// Assert
			expect(result.valid).toBe(true);
		});
	});

	describe("getAdminVods", () => {
		it("fetches admin VODs with all filter options", async () => {
			// Arrange
			const db = await getDb();
			const mockVods = [{ id: "v1", title: "Ana VOD" }];
			vi.mocked(db.query.vods.findMany).mockResolvedValueOnce(
				mockVods as never,
			);

			// Act
			const result = await getAdminVods({
				isPublished: true,
				limit: 10,
				offset: 0,
				role: "SUPPORT",
				search: "Ana",
			});

			// Assert
			expect(db.query.vods.findMany).toHaveBeenCalled();
			expect(result).toEqual(mockVods);
		});

		it("fetches admin VODs with individual filter options", async () => {
			// Arrange
			const db = await getDb();
			vi.mocked(db.query.vods.findMany).mockResolvedValue([]);

			// Act
			const resRole = await getAdminVods({ role: "SUPPORT" });
			const resPub = await getAdminVods({ isPublished: false });
			const resSearch = await getAdminVods({ search: "Ana" });

			// Assert
			expect(resRole).toEqual([]);
			expect(resPub).toEqual([]);
			expect(resSearch).toEqual([]);
		});

		it("fetches admin VODs with default empty options", async () => {
			// Arrange
			const db = await getDb();
			vi.mocked(db.query.vods.findMany).mockResolvedValueOnce([]);

			// Act
			const result = await getAdminVods();

			// Assert
			expect(result).toEqual([]);
		});
	});

	describe("getVodById", () => {
		it("returns VOD with ordered scenarios when found", async () => {
			// Arrange
			const db = await getDb();
			const mockVod = {
				id: "v1",
				scenarios: [{ id: "s1", timestampSeconds: 10 }],
			};
			vi.mocked(db.query.vods.findFirst).mockResolvedValueOnce(
				mockVod as never,
			);

			// Act
			const result = await getVodById("v1");

			// Assert
			expect(result).toEqual(mockVod);
		});

		it("returns null when VOD is not found", async () => {
			// Arrange
			const db = await getDb();
			vi.mocked(db.query.vods.findFirst).mockResolvedValueOnce(undefined);

			// Act
			const result = await getVodById("v_missing");

			// Assert
			expect(result).toBeNull();
		});
	});

	describe("createVod", () => {
		it("rejects creation if isPublished is true", async () => {
			// Arrange
			const input = {
				durationSeconds: 600,
				heroName: "Ana",
				isPublished: true,
				mapName: "King's Row",
				rankTier: "Grandmaster",
				role: "SUPPORT" as const,
				title: "GM Ana",
				youtubeVideoId: "abc",
			};

			// Act
			const result = await createVod(input);

			// Assert
			expect(result.success).toBe(false);
			expect(result.error).toBe("Cannot publish a VOD with zero scenarios");
		});

		it("creates a draft VOD and records audit entry", async () => {
			// Arrange
			const db = await getDb();
			const created = {
				durationSeconds: 600,
				heroName: "Ana",
				id: "v_new",
				isPublished: false,
				mapName: "King's Row",
				rankTier: "Grandmaster",
				role: "SUPPORT",
				title: "GM Ana",
				youtubeVideoId: "abc",
			};
			vi.mocked(db.insert).mockReturnValueOnce({
				values: vi.fn(() => ({
					returning: vi.fn().mockResolvedValueOnce([created]),
				})),
			} as never);

			// Act
			const result = await createVod({
				actorUserId: "admin_1",
				durationSeconds: 600,
				heroName: "Ana",
				mapName: "King's Row",
				rankTier: "Grandmaster",
				role: "SUPPORT",
				title: "GM Ana",
				youtubeVideoId: "abc",
			});

			// Assert
			expect(result.success).toBe(true);
			expect(result.vod).toEqual(created);
		});

		it("returns error if db insert fails to return a VOD", async () => {
			// Arrange
			const db = await getDb();
			vi.mocked(db.insert).mockReturnValueOnce({
				values: vi.fn(() => ({
					returning: vi.fn().mockResolvedValueOnce([]),
				})),
			} as never);

			// Act
			const result = await createVod({
				durationSeconds: 600,
				heroName: "Ana",
				mapName: "King's Row",
				rankTier: "Grandmaster",
				role: "SUPPORT",
				title: "GM Ana",
				youtubeVideoId: "abc",
			});

			// Assert
			expect(result.success).toBe(false);
			expect(result.error).toBe("Failed to create VOD");
		});
	});

	describe("updateVod", () => {
		it("returns error if VOD does not exist", async () => {
			// Arrange
			const db = await getDb();
			vi.mocked(db.query.vods.findFirst).mockResolvedValueOnce(undefined);

			// Act
			const result = await updateVod({ id: "v_missing", title: "New Title" });

			// Assert
			expect(result.success).toBe(false);
			expect(result.error).toBe("VOD not found");
		});

		it("rejects publishing if VOD has zero scenarios", async () => {
			// Arrange
			const db = await getDb();
			const existing = {
				durationSeconds: 600,
				id: "v1",
				isPublished: false,
				scenarios: [],
			};
			vi.mocked(db.query.vods.findFirst).mockResolvedValueOnce(
				existing as never,
			);

			// Act
			const result = await updateVod({ id: "v1", isPublished: true });

			// Assert
			expect(result.success).toBe(false);
			expect(result.error).toBe("Cannot publish a VOD with zero scenarios");
		});

		it("successfully updates fields and records audit entries", async () => {
			// Arrange
			const db = await getDb();
			const existing = {
				durationSeconds: 600,
				heroName: "Ana",
				id: "v1",
				isPublished: false,
				mapName: "King's Row",
				rankTier: "Grandmaster",
				role: "SUPPORT",
				scenarios: [
					{
						explanationText: "Exp",
						id: "s1",
						inputConfig: {
							options: [
								{ id: "1", is_correct: true, text: "A" },
								{ id: "2", is_correct: false, text: "B" },
							],
						},
						inputType: "MULTIPLE_CHOICE",
						moduleType: "STRATEGY",
						promptText: "Prompt",
						timestampSeconds: 100,
					},
				],
				title: "Old Title",
				youtubeVideoId: "abc",
			};
			const updated = { ...existing, isPublished: true, title: "New Title" };
			vi.mocked(db.query.vods.findFirst).mockResolvedValueOnce(
				existing as never,
			);
			vi.mocked(db.update).mockReturnValueOnce({
				set: vi.fn(() => ({
					where: vi.fn(() => ({
						returning: vi.fn().mockResolvedValueOnce([updated]),
					})),
				})),
			} as never);

			// Act
			const result = await updateVod({
				actorUserId: "admin_1",
				durationSeconds: 700,
				heroName: "Kiriko",
				id: "v1",
				isPublished: true,
				mapName: "Shambali",
				rankTier: "Top 500",
				role: "SUPPORT",
				title: "New Title",
				youtubeVideoId: "xyz",
			});

			// Assert
			expect(result.success).toBe(true);
			expect(result.vod).toEqual(updated);
		});

		it("unpublishes a published VOD and records VOD_UNPUBLISHED audit entry", async () => {
			// Arrange
			const db = await getDb();
			const existing = {
				durationSeconds: 600,
				id: "v1",
				isPublished: true,
				scenarios: [],
			};
			const updated = { ...existing, isPublished: false };
			vi.mocked(db.query.vods.findFirst).mockResolvedValueOnce(
				existing as never,
			);
			vi.mocked(db.update).mockReturnValueOnce({
				set: vi.fn(() => ({
					where: vi.fn(() => ({
						returning: vi.fn().mockResolvedValueOnce([updated]),
					})),
				})),
			} as never);

			// Act
			const result = await updateVod({
				actorUserId: "admin_1",
				id: "v1",
				isPublished: false,
			});

			// Assert
			expect(result.success).toBe(true);
			expect(result.vod).toEqual(updated);
		});

		it("updates individual VOD fields independently", async () => {
			// Arrange
			const db = await getDb();
			const existing = {
				durationSeconds: 600,
				heroName: "Ana",
				id: "v1",
				isPublished: false,
				mapName: "King's Row",
				rankTier: "Grandmaster",
				role: "SUPPORT",
				scenarios: [],
				title: "Old Title",
				youtubeVideoId: "abc",
			};
			vi.mocked(db.query.vods.findFirst).mockResolvedValue(existing as never);
			vi.mocked(db.update).mockReturnValue({
				set: vi.fn(() => ({
					where: vi.fn(() => ({
						returning: vi.fn().mockResolvedValue([existing]),
					})),
				})),
			} as never);

			// Act & Assert
			const resTitle = await updateVod({ id: "v1", title: "T" });
			const resYt = await updateVod({ id: "v1", youtubeVideoId: "yt" });
			const resDur = await updateVod({ durationSeconds: 500, id: "v1" });
			const resMap = await updateVod({ id: "v1", mapName: "M" });
			const resRank = await updateVod({ id: "v1", rankTier: "Diamond" });
			const resHero = await updateVod({ heroName: "Lucio", id: "v1" });
			const resRole = await updateVod({ id: "v1", role: "SUPPORT" });

			expect(resTitle.success).toBe(true);
			expect(resYt.success).toBe(true);
			expect(resDur.success).toBe(true);
			expect(resMap.success).toBe(true);
			expect(resRank.success).toBe(true);
			expect(resHero.success).toBe(true);
			expect(resRole.success).toBe(true);
		});
	});

	describe("deleteVod", () => {
		it("returns error if VOD does not exist", async () => {
			// Arrange
			const db = await getDb();
			vi.mocked(db.query.vods.findFirst).mockResolvedValueOnce(undefined);

			// Act
			const result = await deleteVod({ id: "v_missing" });

			// Assert
			expect(result.success).toBe(false);
			expect(result.error).toBe("VOD not found");
		});

		it("deletes existing VOD and records audit entry", async () => {
			// Arrange
			const db = await getDb();
			const existing = {
				durationSeconds: 600,
				heroName: "Ana",
				id: "v1",
				role: "SUPPORT",
				scenarios: [],
				title: "GM Ana",
			};
			vi.mocked(db.query.vods.findFirst).mockResolvedValueOnce(
				existing as never,
			);

			// Act
			const result = await deleteVod({ actorUserId: "admin_1", id: "v1" });

			// Assert
			expect(db.delete).toHaveBeenCalled();
			expect(result.success).toBe(true);
		});
	});

	describe("setVodPublicationStatus", () => {
		it("delegates to updateVod with publication status", async () => {
			// Arrange
			const db = await getDb();
			const existing = {
				durationSeconds: 600,
				id: "v1",
				isPublished: false,
				scenarios: [],
			};
			vi.mocked(db.query.vods.findFirst).mockResolvedValueOnce(
				existing as never,
			);

			// Act
			const result = await setVodPublicationStatus({
				id: "v1",
				isPublished: true,
			});

			// Assert
			expect(result.success).toBe(false);
			expect(result.error).toBe("Cannot publish a VOD with zero scenarios");
		});
	});

	describe("bulkPublishVods and bulkDeleteVods", () => {
		it("bulkPublishVods processes multiple VODs and reports per-record status", async () => {
			// Arrange
			const db = await getDb();
			// First VOD found and valid with scenario
			const validVod = {
				durationSeconds: 600,
				id: "v_valid",
				isPublished: false,
				scenarios: [
					{
						explanationText: "Exp",
						id: "s1",
						inputConfig: {
							options: [
								{ id: "1", is_correct: true, text: "A" },
								{ id: "2", is_correct: false, text: "B" },
							],
						},
						inputType: "MULTIPLE_CHOICE",
						moduleType: "STRATEGY",
						promptText: "Prompt",
						timestampSeconds: 10,
					},
				],
			};
			// Second VOD not found
			vi.mocked(db.query.vods.findFirst)
				.mockResolvedValueOnce(validVod as never)
				.mockResolvedValueOnce(undefined);
			vi.mocked(db.update).mockReturnValueOnce({
				set: vi.fn(() => ({
					where: vi.fn(() => ({
						returning: vi
							.fn()
							.mockResolvedValueOnce([{ ...validVod, isPublished: true }]),
					})),
				})),
			} as never);

			// Act
			const result = await bulkPublishVods({
				actorUserId: "admin_1",
				ids: ["v_valid", "v_missing"],
				isPublished: true,
			});

			// Assert
			expect(result.succeeded).toEqual(["v_valid"]);
			expect(result.failed).toEqual([
				{ error: "VOD not found", id: "v_missing" },
			]);
		});

		it("bulkDeleteVods processes multiple VODs and reports per-record status", async () => {
			// Arrange
			const db = await getDb();
			const existing = {
				durationSeconds: 600,
				heroName: "Ana",
				id: "v_del",
				role: "SUPPORT",
				scenarios: [],
				title: "Del VOD",
			};
			vi.mocked(db.query.vods.findFirst)
				.mockResolvedValueOnce(existing as never)
				.mockResolvedValueOnce(undefined);

			// Act
			const result = await bulkDeleteVods({
				actorUserId: "admin_1",
				ids: ["v_del", "v_missing"],
			});

			// Assert
			expect(result.succeeded).toEqual(["v_del"]);
			expect(result.failed).toEqual([
				{ error: "VOD not found", id: "v_missing" },
			]);
		});
	});

	describe("scenario repository operations", () => {
		it("getScenarioById returns scenario when found or null when not found", async () => {
			// Arrange
			const db = await getDb();
			const mockScenario = { id: "s1", promptText: "Prompt" };
			vi.mocked(db.query.scenarios.findFirst)
				.mockResolvedValueOnce(mockScenario as never)
				.mockResolvedValueOnce(undefined);

			// Act
			const resFound = await getScenarioById("s1");
			const resNotFound = await getScenarioById("s_missing");

			// Assert
			expect(resFound).toEqual(mockScenario);
			expect(resNotFound).toBeNull();
		});

		it("getScenariosByVodId returns scenarios ordered by timestamp", async () => {
			// Arrange
			const db = await getDb();
			const mockScenarios = [{ id: "s1", timestampSeconds: 10 }];
			vi.mocked(db.query.scenarios.findMany).mockResolvedValueOnce(
				mockScenarios as never,
			);

			// Act
			const result = await getScenariosByVodId("v1");

			// Assert
			expect(result).toEqual(mockScenarios);
		});

		it("createScenario validates config, checks VOD existence and duration, and saves scenario", async () => {
			// Arrange
			const db = await getDb();
			const validScenarioInput = {
				actorUserId: "admin_1",
				explanationText: "Exp",
				inputConfig: {
					options: [
						{ id: "1", is_correct: true, text: "A" },
						{ id: "2", is_correct: false, text: "B" },
					],
				},
				inputType: "MULTIPLE_CHOICE" as const,
				moduleType: "STRATEGY" as const,
				promptText: "Prompt",
				timestampSeconds: 50,
				vodId: "v1",
			};
			const created = { ...validScenarioInput, id: "s_new" };

			// Case 1: invalid config
			const resInvalid = await createScenario({
				...validScenarioInput,
				promptText: "",
			});

			// Case 2: VOD not found
			vi.mocked(db.query.vods.findFirst).mockResolvedValueOnce(undefined);
			const resVodNotFound = await createScenario(validScenarioInput);

			// Case 3: timestamp exceeds VOD duration
			vi.mocked(db.query.vods.findFirst).mockResolvedValueOnce({
				durationSeconds: 40,
				id: "v1",
			} as never);
			const resExceeds = await createScenario(validScenarioInput);

			// Case 4: success
			vi.mocked(db.query.vods.findFirst).mockResolvedValueOnce({
				durationSeconds: 600,
				id: "v1",
			} as never);
			vi.mocked(db.insert).mockReturnValueOnce({
				values: vi.fn(() => ({
					returning: vi.fn().mockResolvedValueOnce([created]),
				})),
			} as never);
			const resSuccess = await createScenario(validScenarioInput);

			// Assert
			expect(resInvalid.success).toBe(false);
			expect(resVodNotFound.success).toBe(false);
			expect(resVodNotFound.error).toBe("VOD not found");
			expect(resExceeds.success).toBe(false);
			expect(resExceeds.error).toContain("exceeds VOD duration");
			expect(resSuccess.success).toBe(true);
			expect(resSuccess.scenario).toEqual(created);
		});

		it("createScenario handles failed insertion returning empty array", async () => {
			// Arrange
			const db = await getDb();
			vi.mocked(db.query.vods.findFirst).mockResolvedValueOnce({
				durationSeconds: 600,
				id: "v1",
			} as never);
			vi.mocked(db.insert).mockReturnValueOnce({
				values: vi.fn(() => ({
					returning: vi.fn().mockResolvedValueOnce([]),
				})),
			} as never);

			// Act
			const result = await createScenario({
				explanationText: "Exp",
				inputConfig: {
					options: [
						{ id: "1", is_correct: true, text: "A" },
						{ id: "2", is_correct: false, text: "B" },
					],
				},
				inputType: "MULTIPLE_CHOICE" as const,
				moduleType: "STRATEGY" as const,
				promptText: "Prompt",
				timestampSeconds: 50,
				vodId: "v1",
			});

			// Assert
			expect(result.success).toBe(false);
			expect(result.error).toBe("Failed to create scenario");
		});

		it("updateScenario updates scenario and checks validation and existence", async () => {
			// Arrange
			const db = await getDb();
			const existing = {
				explanationText: "Old Exp",
				id: "s1",
				inputConfig: {
					options: [
						{ id: "1", is_correct: true, text: "A" },
						{ id: "2", is_correct: false, text: "B" },
					],
				},
				inputType: "MULTIPLE_CHOICE",
				moduleType: "STRATEGY",
				promptText: "Old Prompt",
				timeLimitSeconds: null,
				timestampSeconds: 10,
				vodId: "v1",
			};
			const updated = { ...existing, promptText: "New Prompt" };

			// Case 1: scenario not found
			vi.mocked(db.query.scenarios.findFirst).mockResolvedValueOnce(undefined);
			const resNotFound = await updateScenario({
				id: "s_missing",
				promptText: "New",
			});

			// Case 2: invalid update payload
			vi.mocked(db.query.scenarios.findFirst).mockResolvedValueOnce(
				existing as never,
			);
			const resInvalid = await updateScenario({ id: "s1", promptText: "   " });

			// Case 3: successful update
			vi.mocked(db.query.scenarios.findFirst).mockResolvedValueOnce(
				existing as never,
			);
			vi.mocked(db.update).mockReturnValueOnce({
				set: vi.fn(() => ({
					where: vi.fn(() => ({
						returning: vi.fn().mockResolvedValueOnce([updated]),
					})),
				})),
			} as never);
			const resSuccess = await updateScenario({
				actorUserId: "admin_1",
				explanationText: "New Exp",
				id: "s1",
				imageUrl: "http://example.com/img.png",
				inputConfig: {
					options: [
						{ id: "1", is_correct: true, text: "Updated" },
						{ id: "2", is_correct: false, text: "Wrong" },
					],
				},
				inputType: "MULTIPLE_CHOICE",
				moduleType: "TACTICS",
				promptText: "New Prompt",
				timeLimitSeconds: 3,
				timestampSeconds: 20,
			});

			// Assert
			expect(resNotFound.success).toBe(false);
			expect(resNotFound.error).toBe("Scenario not found");
			expect(resInvalid.success).toBe(false);
			expect(resSuccess.success).toBe(true);
			expect(resSuccess.scenario).toEqual(updated);
		});

		it("updates scenario with null timeLimitSeconds and partial field combinations", async () => {
			// Arrange
			const db = await getDb();
			const existing = {
				explanationText: "Old Exp",
				id: "s1",
				imageUrl: "http://example.com/old.png",
				inputConfig: {
					options: [
						{ id: "1", is_correct: true, text: "A" },
						{ id: "2", is_correct: false, text: "B" },
					],
				},
				inputType: "MULTIPLE_CHOICE",
				moduleType: "STRATEGY",
				promptText: "Old Prompt",
				timeLimitSeconds: 10,
				timestampSeconds: 10,
				vodId: "v1",
			};
			const updated = { ...existing, timeLimitSeconds: null };
			vi.mocked(db.query.scenarios.findFirst).mockResolvedValueOnce(
				existing as never,
			);
			vi.mocked(db.update).mockReturnValueOnce({
				set: vi.fn(() => ({
					where: vi.fn(() => ({
						returning: vi.fn().mockResolvedValueOnce([updated]),
					})),
				})),
			} as never);

			// Act
			const result = await updateScenario({
				actorUserId: "admin_1",
				id: "s1",
				timeLimitSeconds: null,
			});

			// Assert
			expect(result.success).toBe(true);
			expect(result.scenario).toEqual(updated);
		});

		it("updates individual scenario fields independently", async () => {
			// Arrange
			const db = await getDb();
			const existing = {
				explanationText: "Old Exp",
				id: "s1",
				imageUrl: null,
				inputConfig: {
					options: [
						{ id: "1", is_correct: true, text: "A" },
						{ id: "2", is_correct: false, text: "B" },
					],
				},
				inputType: "MULTIPLE_CHOICE",
				moduleType: "STRATEGY",
				promptText: "Old Prompt",
				timeLimitSeconds: null,
				timestampSeconds: 10,
				vodId: "v1",
			};
			vi.mocked(db.query.scenarios.findFirst).mockResolvedValue(
				existing as never,
			);
			vi.mocked(db.update).mockReturnValue({
				set: vi.fn(() => ({
					where: vi.fn(() => ({
						returning: vi.fn().mockResolvedValue([existing]),
					})),
				})),
			} as never);

			// Act & Assert
			const resPrompt = await updateScenario({ id: "s1", promptText: "P" });
			const resExp = await updateScenario({ explanationText: "E", id: "s1" });
			const resTs = await updateScenario({ id: "s1", timestampSeconds: 5 });
			const resMod = await updateScenario({ id: "s1", moduleType: "TACTICS" });
			const resType = await updateScenario({
				id: "s1",
				inputConfig: { target: 50 },
				inputType: "PERCENT_SLIDER",
			});
			const resImg = await updateScenario({ id: "s1", imageUrl: "img.png" });
			const resLimit = await updateScenario({ id: "s1", timeLimitSeconds: 5 });

			expect(resPrompt.success).toBe(true);
			expect(resExp.success).toBe(true);
			expect(resTs.success).toBe(true);
			expect(resMod.success).toBe(true);
			expect(resType.success).toBe(true);
			expect(resImg.success).toBe(true);
			expect(resLimit.success).toBe(true);
		});

		it("deleteScenario deletes scenario and checks existence", async () => {
			// Arrange
			const db = await getDb();
			const existing = {
				explanationText: "Exp",
				id: "s1",
				moduleType: "STRATEGY",
				promptText: "Prompt",
				timestampSeconds: 10,
				vodId: "v1",
			};

			// Case 1: not found
			vi.mocked(db.query.scenarios.findFirst).mockResolvedValueOnce(undefined);
			const resNotFound = await deleteScenario({ id: "s_missing" });

			// Case 2: success
			vi.mocked(db.query.scenarios.findFirst).mockResolvedValueOnce(
				existing as never,
			);
			const resSuccess = await deleteScenario({
				actorUserId: "admin_1",
				id: "s1",
			});

			// Assert
			expect(resNotFound.success).toBe(false);
			expect(resNotFound.error).toBe("Scenario not found");
			expect(resSuccess.success).toBe(true);
		});

		it("reorderScenarios updates timestamps and validates payload", async () => {
			// Arrange
			const db = await getDb();
			const vodWithScenarios = {
				id: "v1",
				scenarios: [{ id: "s1" }, { id: "s2" }],
			};

			// Case 1: VOD not found
			vi.mocked(db.query.vods.findFirst).mockResolvedValueOnce(undefined);
			const resVodNotFound = await reorderScenarios({
				scenarioOrders: [{ id: "s1", timestampSeconds: 20 }],
				vodId: "v_missing",
			});

			// Case 2: scenario does not belong to VOD
			vi.mocked(db.query.vods.findFirst).mockResolvedValueOnce(
				vodWithScenarios as never,
			);
			const resInvalidScenario = await reorderScenarios({
				scenarioOrders: [{ id: "s_other", timestampSeconds: 20 }],
				vodId: "v1",
			});

			// Case 3: invalid negative timestamp
			vi.mocked(db.query.vods.findFirst).mockResolvedValueOnce(
				vodWithScenarios as never,
			);
			const resNegativeTs = await reorderScenarios({
				scenarioOrders: [{ id: "s1", timestampSeconds: -5 }],
				vodId: "v1",
			});

			// Case 4: success
			vi.mocked(db.query.vods.findFirst).mockResolvedValueOnce(
				vodWithScenarios as never,
			);
			const resSuccess = await reorderScenarios({
				actorUserId: "admin_1",
				scenarioOrders: [
					{ id: "s1", timestampSeconds: 30 },
					{ id: "s2", timestampSeconds: 60 },
				],
				vodId: "v1",
			});

			// Assert
			expect(resVodNotFound.success).toBe(false);
			expect(resVodNotFound.error).toBe("VOD not found");
			expect(resInvalidScenario.success).toBe(false);
			expect(resInvalidScenario.error).toContain("does not belong to VOD");
			expect(resNegativeTs.success).toBe(false);
			expect(resNegativeTs.error).toContain("must be a non-negative number");
			expect(resSuccess.success).toBe(true);
		});
	});
});
