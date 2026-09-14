/**
 * Tests domain rule logic for player match history retrieval.
 *
 * Verifies authenticated retrieval, unauthenticated rejections, and test-account filtering
 * returning discriminated unions without throwing runtime exceptions.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/db");
vi.mock("@/shared/lib/auth");

import {
	createDbClient,
	getUserById,
	getVodById,
	queryAttemptRecords,
	queryPlaythroughCompletions,
	queryPlaythroughModuleSelections,
	queryPlaythroughs,
	queryScenarioSnapshots,
} from "@/shared/db";
import { getCurrentUser } from "@/shared/lib/auth";
import { getHistoryRule } from "../get-history";

describe("getHistoryRule", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(createDbClient).mockReturnValue({} as never);
	});

	it("queries player history for the authenticated user and returns success", async () => {
		// Arrange
		vi.mocked(getCurrentUser).mockResolvedValueOnce({
			id: "player_123",
		});
		vi.mocked(getUserById).mockResolvedValueOnce({
			id: "player_123",
			isTestAccount: false,
		} as never);
		const createdAt = new Date();
		const completedAt = new Date();
		vi.mocked(queryPlaythroughs).mockResolvedValueOnce([
			{
				completedAt,
				createdAt,
				id: "run_1",
				status: "COMPLETED",
				userId: "player_123",
				vodId: "vod_1",
			},
		] as never);
		vi.mocked(queryPlaythroughModuleSelections).mockResolvedValueOnce([
			{ moduleType: "STRATEGY" },
		] as never);
		vi.mocked(queryAttemptRecords).mockResolvedValueOnce([
			{
				createdAt,
				id: "att_1",
				inputValue: null,
				isCorrect: true,
				isTimedOut: false,
				playthroughId: "run_1",
				responseTimeMs: 1000,
				scenarioId: "sc_1",
				scenarioSnapshotId: "snap_1",
				selectedOptionId: null,
				userId: "player_123",
			},
		] as never);
		vi.mocked(queryPlaythroughCompletions).mockResolvedValueOnce([
			{
				completedAt,
				id: "comp_1",
				playthroughId: "run_1",
				userId: "player_123",
			},
		] as never);
		vi.mocked(queryScenarioSnapshots).mockResolvedValueOnce([
			{
				explanationText: "exp",
				id: "snap_1",
				imageUrl: null,
				inputConfig: {},
				inputType: "MULTIPLE_CHOICE",
				moduleType: "STRATEGY",
				position: 0,
				promptText: "prompt",
				scenarioId: "sc_1",
				timeLimitSeconds: 10,
				timestampSeconds: 5,
			},
		] as never);
		vi.mocked(getVodById).mockResolvedValueOnce({
			durationSeconds: 100,
			id: "vod_1",
			mapName: "King's Row",
			rankTier: "GM",
			title: "VOD 1",
			youtubeVideoId: "yt123",
		} as never);

		// Act
		const result = await getHistoryRule({
			modules: ["STRATEGY"],
			page: 1,
			pageSize: 10,
			status: "COMPLETED",
			vodId: "vod_1",
		});

		// Assert
		expect(result.status).toBe("success");
		if (result.status === "success") {
			expect(result.data.total).toBe(1);
			expect(result.data.items).toHaveLength(1);
			expect(result.data.items[0]?.id).toBe("run_1");
			expect(result.data.items[0]?.accuracy).toBe(100);
		}
	});

	it("returns rejected when user is not authenticated", async () => {
		// Arrange
		vi.mocked(getCurrentUser).mockResolvedValueOnce(null);

		// Act
		const result = await getHistoryRule();

		// Assert
		expect(result).toEqual({
			reason: "Authentication required",
			status: "rejected",
		});
	});

	it("returns empty paginated result for test account", async () => {
		// Arrange
		vi.mocked(getCurrentUser).mockResolvedValue({
			id: "player_123",
		});
		vi.mocked(getUserById).mockResolvedValue({
			id: "player_123",
			isTestAccount: true,
		} as never);

		// Act
		const resultExplicit = await getHistoryRule({ page: 2, pageSize: 5 });
		const resultDefault = await getHistoryRule({});

		// Assert
		expect(resultExplicit).toEqual({
			data: {
				items: [],
				page: 2,
				pageSize: 5,
				total: 0,
				totalPages: 1,
			},
			status: "success",
		});
		expect(resultDefault).toEqual({
			data: {
				items: [],
				page: 1,
				pageSize: 10,
				total: 0,
				totalPages: 1,
			},
			status: "success",
		});
	});

	it("filters out runs that do not match requested modules and handles empty completion/vod", async () => {
		// Arrange
		const createdAt = new Date("2026-01-01T00:00:00Z");
		vi.mocked(getUserById).mockResolvedValueOnce({
			id: "player_456",
			isTestAccount: false,
		} as never);
		vi.mocked(queryPlaythroughs).mockResolvedValueOnce([
			{
				completedAt: null,
				createdAt,
				id: "run_mismatch",
				status: "IN_PROGRESS",
				userId: "player_456",
				vodId: "vod_1",
			},
			{
				completedAt: null,
				createdAt,
				id: "run_match",
				status: "IN_PROGRESS",
				userId: "player_456",
				vodId: "vod_1",
			},
		] as never);
		vi.mocked(queryPlaythroughModuleSelections)
			.mockResolvedValueOnce([{ moduleType: "TACTICS" }] as never)
			.mockResolvedValueOnce([{ moduleType: "STRATEGY" }] as never);
		vi.mocked(queryAttemptRecords).mockResolvedValueOnce([]);
		vi.mocked(queryPlaythroughCompletions).mockResolvedValueOnce([]);
		vi.mocked(queryScenarioSnapshots).mockResolvedValueOnce([]);
		vi.mocked(getVodById).mockResolvedValueOnce(undefined);

		// Act
		const result = await getHistoryRule({
			modules: ["STRATEGY"],
			userId: "player_456",
		});

		// Assert
		expect(result.status).toBe("success");
		if (result.status === "success") {
			expect(result.data.items).toHaveLength(1);
			expect(result.data.items[0]?.id).toBe("run_match");
			expect(result.data.items[0]?.completion).toBeNull();
			expect(result.data.items[0]?.vod).toBeNull();
		}
	});

	it("handles empty modules array without filtering", async () => {
		// Arrange
		const createdAt = new Date("2026-01-01T00:00:00Z");
		vi.mocked(getUserById).mockResolvedValueOnce({
			id: "player_456",
			isTestAccount: false,
		} as never);
		vi.mocked(queryPlaythroughs).mockResolvedValueOnce([
			{
				completedAt: null,
				createdAt,
				id: "run_all",
				status: "IN_PROGRESS",
				userId: "player_456",
				vodId: "vod_1",
			},
		] as never);
		vi.mocked(queryPlaythroughModuleSelections).mockResolvedValueOnce([]);
		vi.mocked(queryAttemptRecords).mockResolvedValueOnce([]);
		vi.mocked(queryPlaythroughCompletions).mockResolvedValueOnce([]);
		vi.mocked(queryScenarioSnapshots).mockResolvedValueOnce([]);
		vi.mocked(getVodById).mockResolvedValueOnce(undefined);

		// Act
		const result = await getHistoryRule({
			modules: [],
			userId: "player_456",
		});

		// Assert
		expect(result.status).toBe("success");
		if (result.status === "success") {
			expect(result.data.items).toHaveLength(1);
			expect(result.data.items[0]?.id).toBe("run_all");
		}
	});
});
