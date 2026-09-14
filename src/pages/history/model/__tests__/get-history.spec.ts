/**
 * Tests domain rule logic for player match history retrieval.
 *
 * Verifies authenticated retrieval, unauthenticated rejections, and database failure mappings
 * returning discriminated unions without throwing runtime exceptions.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/db");
vi.mock("@/shared/lib/auth");

import { playthroughService } from "@/shared/db";
import { getCurrentUser } from "@/shared/lib/auth";
import { getHistoryRule } from "../get-history";

describe("getHistoryRule", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("queries player history for the authenticated user and returns success", async () => {
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
		vi.mocked(playthroughService.listHistory).mockResolvedValueOnce({
			data: expectedHistory,
			success: true,
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
		expect(result).toEqual({
			data: expectedHistory,
			status: "success",
		});
		expect(playthroughService.listHistory).toHaveBeenCalledWith(
			{
				modules: ["STRATEGY"],
				page: 1,
				pageSize: 10,
				status: "COMPLETED",
				userId: "player_123",
				vodId: "vod_1",
			},
			undefined,
		);
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

	it("returns rejected when listHistory fails", async () => {
		// Arrange
		vi.mocked(getCurrentUser).mockResolvedValueOnce({
			id: "player_123",
		});
		vi.mocked(playthroughService.listHistory).mockResolvedValueOnce({
			error: "Database error",
			success: false,
		} as never);

		// Act
		const result = await getHistoryRule();

		// Assert
		expect(result).toEqual({
			reason: "Database error",
			status: "rejected",
		});
	});
});
