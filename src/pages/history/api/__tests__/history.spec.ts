import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/db");
vi.mock("@/shared/lib/auth");

import { queryPlayerHistory } from "@/shared/db";
import { getCurrentUser } from "@/shared/lib/auth";
import { getPlayerHistoryData } from "../history";

describe("getPlayerHistoryData", () => {
	beforeEach(() => {
		vi.clearAllMocks();
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
		vi.mocked(queryPlayerHistory).mockResolvedValueOnce({
			data: expectedHistory,
			success: true,
		} as never);

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

	it("throws error when user is not authenticated", async () => {
		// Arrange
		vi.mocked(getCurrentUser).mockResolvedValueOnce(null);

		// Act & Assert
		await expect(getPlayerHistoryData()).rejects.toThrow(
			"Authentication required",
		);
	});

	it("throws error when queryPlayerHistory fails", async () => {
		// Arrange
		vi.mocked(getCurrentUser).mockResolvedValueOnce({
			id: "player_123",
		});
		vi.mocked(queryPlayerHistory).mockResolvedValueOnce({
			error: "Database error",
			success: false,
		} as never);

		// Act & Assert
		await expect(getPlayerHistoryData()).rejects.toThrow(
			"Failed to query player history: Database error",
		);
	});
});
