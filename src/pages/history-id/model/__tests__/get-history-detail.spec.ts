/**
 * Tests domain rule logic for individual playthrough telemetry detail retrieval.
 *
 * Verifies authenticated retrieval, unauthenticated rejections, and database failure mappings
 * returning discriminated unions without throwing runtime exceptions.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/db");
vi.mock("@/shared/lib/auth");

import { playthroughService } from "@/shared/db";
import { getCurrentUser } from "@/shared/lib/auth";
import { getHistoryDetailRule } from "../get-history-detail";

describe("getHistoryDetailRule", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("retrieves playthrough history detail for the authenticated user", async () => {
		// Arrange
		vi.mocked(getCurrentUser).mockResolvedValueOnce({
			id: "player_123",
		});
		const expectedDetail = {
			accuracy: 100,
			attempts: [],
			completedAt: new Date(),
			completion: null,
			createdAt: new Date(),
			id: "playthrough_1",
			medianLatencyMs: 1200,
			moduleSelections: [],
			scenarioSnapshots: [],
			status: "COMPLETED" as const,
			userId: "player_123",
			vodId: "vod_1",
		};
		vi.mocked(playthroughService.getHistoryDetail).mockResolvedValueOnce({
			data: expectedDetail as never,
			success: true,
		});

		// Act
		const result = await getHistoryDetailRule({ id: "playthrough_1" });

		// Assert
		expect(result).toEqual({
			data: expectedDetail,
			status: "success",
		});
		expect(playthroughService.getHistoryDetail).toHaveBeenCalledWith(
			{
				playthroughId: "playthrough_1",
				userId: "player_123",
			},
			undefined,
		);
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

	it("returns rejected when getHistoryDetail returns failure", async () => {
		// Arrange
		vi.mocked(getCurrentUser).mockResolvedValueOnce({
			id: "player_123",
		});
		vi.mocked(playthroughService.getHistoryDetail).mockResolvedValueOnce({
			error: "Not found",
			success: false,
		});

		// Act
		const result = await getHistoryDetailRule({ id: "playthrough_1" });

		// Assert
		expect(result).toEqual({
			reason: "Failed to lookup playthrough detail: Not found",
			status: "rejected",
		});
	});
});
