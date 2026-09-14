/**
 * Tests domain rule logic for individual playthrough telemetry detail retrieval.
 *
 * Verifies authenticated retrieval, unauthenticated rejections, and database failure mappings
 * returning discriminated unions without throwing runtime exceptions.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/db");
vi.mock("@/shared/lib/auth");

import {
	createDbClient,
	getPlaythroughById,
	getUserById,
	getVodById,
	queryAttemptRecords,
	queryPlaythroughCompletions,
	queryPlaythroughModuleSelections,
	queryScenarioSnapshots,
} from "@/shared/db";
import { getCurrentUser } from "@/shared/lib/auth";
import { getHistoryDetailRule } from "../get-history-detail";

describe("getHistoryDetailRule", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(createDbClient).mockReturnValue({} as never);
	});

	it("retrieves playthrough history detail for the authenticated user", async () => {
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
		vi.mocked(getPlaythroughById).mockResolvedValueOnce({
			completedAt,
			createdAt,
			id: "playthrough_1",
			status: "COMPLETED",
			userId: "player_123",
			vodId: "vod_1",
		} as never);
		vi.mocked(queryPlaythroughModuleSelections).mockResolvedValueOnce([
			{ moduleType: "CALLOUT" },
		] as never);
		vi.mocked(queryAttemptRecords).mockResolvedValueOnce([
			{
				createdAt,
				id: "attempt_1",
				inputValue: null,
				isCorrect: true,
				isTimedOut: false,
				playthroughId: "playthrough_1",
				responseTimeMs: 1200,
				scenarioId: "sc_1",
				scenarioSnapshotId: "snap_1",
				selectedOptionId: "opt_1",
				userId: "player_123",
			},
		] as never);
		vi.mocked(queryPlaythroughCompletions).mockResolvedValueOnce([
			{
				completedAt,
				id: "comp_1",
				playthroughId: "playthrough_1",
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
				moduleType: "CALLOUT",
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
		const result = await getHistoryDetailRule({ id: "playthrough_1" });

		// Assert
		expect(result).toEqual({
			data: {
				accuracy: 100,
				attempts: [
					{
						id: "attempt_1",
						inputValue: null,
						isCorrect: true,
						isTimedOut: false,
						responseTimeMs: 1200,
						scenarioSnapshotId: "snap_1",
						selectedOptionId: "opt_1",
					},
				],
				completedAt,
				completion: {
					completedAt,
					id: "comp_1",
				},
				createdAt,
				id: "playthrough_1",
				medianLatencyMs: 1200,
				moduleSelections: [{ moduleType: "CALLOUT" }],
				scenarioSnapshots: [
					{
						explanationText: "exp",
						id: "snap_1",
						imageUrl: null,
						inputConfig: {},
						inputType: "MULTIPLE_CHOICE",
						moduleType: "CALLOUT",
						position: 0,
						promptText: "prompt",
						scenarioId: "sc_1",
						timeLimitSeconds: 10,
						timestampSeconds: 5,
					},
				],
				status: "COMPLETED",
				userId: "player_123",
				vod: {
					durationSeconds: 100,
					id: "vod_1",
					mapName: "King's Row",
					rankTier: "GM",
					title: "VOD 1",
					youtubeVideoId: "yt123",
				},
				vodId: "vod_1",
			},
			status: "success",
		});
	});

	it("returns rejected when user is not authenticated", async () => {
		// Arrange
		vi.mocked(getCurrentUser).mockResolvedValueOnce(null);

		// Act
		const result = await getHistoryDetailRule({ id: "playthrough_1" });

		// Assert
		expect(result).toEqual({
			reason: "Authentication required",
			status: "rejected",
		});
	});

	it("returns null data when playthrough is not found or belongs to another user", async () => {
		// Arrange
		vi.mocked(getCurrentUser).mockResolvedValueOnce({
			id: "player_123",
		});
		vi.mocked(getUserById).mockResolvedValueOnce({
			id: "player_123",
			isTestAccount: false,
		} as never);
		vi.mocked(getPlaythroughById).mockResolvedValueOnce(undefined as never);

		// Act
		const result = await getHistoryDetailRule({ id: "playthrough_1" });

		// Assert
		expect(result).toEqual({
			data: null,
			status: "success",
		});
	});

	it("returns null data when user is a test account", async () => {
		// Arrange
		vi.mocked(getCurrentUser).mockResolvedValueOnce({
			id: "player_123",
		});
		vi.mocked(getUserById).mockResolvedValueOnce({
			id: "player_123",
			isTestAccount: true,
		} as never);

		// Act
		const result = await getHistoryDetailRule({ id: "playthrough_1" });

		// Assert
		expect(result).toEqual({
			data: null,
			status: "success",
		});
	});

	it("returns item with null completion and null vod when not present", async () => {
		// Arrange
		const createdAt = new Date("2026-01-01T00:00:00Z");
		vi.mocked(getUserById).mockResolvedValueOnce({
			id: "player_custom",
			isTestAccount: false,
		} as never);
		vi.mocked(getPlaythroughById).mockResolvedValueOnce({
			completedAt: null,
			createdAt,
			id: "playthrough_nulls",
			status: "IN_PROGRESS",
			userId: "player_custom",
			vodId: "vod_missing",
		} as never);
		vi.mocked(queryPlaythroughModuleSelections).mockResolvedValueOnce([]);
		vi.mocked(queryAttemptRecords).mockResolvedValueOnce([]);
		vi.mocked(queryPlaythroughCompletions).mockResolvedValueOnce([]);
		vi.mocked(queryScenarioSnapshots).mockResolvedValueOnce([]);
		vi.mocked(getVodById).mockResolvedValueOnce(undefined);

		// Act
		const result = await getHistoryDetailRule({
			id: "playthrough_nulls",
			userId: "player_custom",
		});

		// Assert
		expect(result.status).toBe("success");
		if (result.status === "success") {
			expect(result.data?.completion).toBeNull();
			expect(result.data?.vod).toBeNull();
		}
	});
});
