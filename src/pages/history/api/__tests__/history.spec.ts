import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPlaythroughHistoryDetail, queryPlayerHistory } from "@/shared/db";
import { getCurrentUser } from "@/shared/lib/auth";
import {
	getPlayerHistoryData,
	getPlaythroughHistoryDetailData,
} from "../history";

vi.mock("@/shared/lib/auth");
vi.mock("@/shared/db");

describe("History API data accessors", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("getPlayerHistoryData", () => {
		it("throws an error when user is unauthenticated", async () => {
			// Arrange
			vi.mocked(getCurrentUser).mockResolvedValueOnce(null);

			// Act & Assert
			await expect(getPlayerHistoryData({})).rejects.toThrow(
				"Authentication required",
			);
		});

		it("queries player history for the authenticated user", async () => {
			// Arrange
			vi.mocked(getCurrentUser).mockResolvedValueOnce({
				id: "player_123",
			});
			const expectedHistory = {
				items: [],
				page: 1,
				pageSize: 10,
				total: 0,
				totalPages: 1,
			};
			vi.mocked(queryPlayerHistory).mockResolvedValueOnce(
				expectedHistory as never,
			);

			// Act
			const result = await getPlayerHistoryData({
				modules: ["STRATEGY"],
				page: 1,
				pageSize: 10,
				status: "COMPLETED",
				vodId: "vod_1",
			});

			// Assert
			expect(result).toEqual(expectedHistory);
			expect(queryPlayerHistory).toHaveBeenCalledWith(
				"player_123",
				{
					modules: ["STRATEGY"],
					page: 1,
					pageSize: 10,
					status: "COMPLETED",
					vodId: "vod_1",
				},
				undefined,
			);
		});
	});

	describe("getPlaythroughHistoryDetailData", () => {
		it("throws an error when user is unauthenticated", async () => {
			// Arrange
			vi.mocked(getCurrentUser).mockResolvedValueOnce(null);

			// Act & Assert
			await expect(
				getPlaythroughHistoryDetailData("playthrough_1"),
			).rejects.toThrow("Authentication required");
		});

		it("returns detail for owned playthrough", async () => {
			// Arrange
			vi.mocked(getCurrentUser).mockResolvedValueOnce({
				id: "player_123",
			});
			const expectedDetail = {
				accuracy: 80,
				id: "playthrough_1",
				medianLatencyMs: 1400,
			};
			vi.mocked(getPlaythroughHistoryDetail).mockResolvedValueOnce(
				expectedDetail as never,
			);

			// Act
			const result = await getPlaythroughHistoryDetailData("playthrough_1");

			// Assert
			expect(result).toEqual(expectedDetail);
			expect(getPlaythroughHistoryDetail).toHaveBeenCalledWith(
				"playthrough_1",
				"player_123",
				undefined,
			);
		});

		it("returns null when playthrough is not found or not owned", async () => {
			// Arrange
			vi.mocked(getCurrentUser).mockResolvedValueOnce({
				id: "player_123",
			});
			vi.mocked(getPlaythroughHistoryDetail).mockResolvedValueOnce(null);

			// Act
			const result = await getPlaythroughHistoryDetailData("unowned_run");

			// Assert
			expect(result).toBeNull();
		});
	});
});
