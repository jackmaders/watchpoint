import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/entities/vod");
vi.mock("@/shared/lib/auth");
vi.mock("../server-fns");

import { getPublishedVods } from "@/entities/vod";
import { isRegistrationOpen } from "@/shared/lib/auth";
import { loadHistoryIndexPage, loadPlayerHistory } from "../loaders";
import { getPlayerHistory } from "../server-fns";

describe("history loaders", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(isRegistrationOpen).mockResolvedValue(true);
	});

	describe("loadPlayerHistory", () => {
		it("fetches player history with search params", async () => {
			// Arrange
			const mockHistoryResult = {
				items: [{ id: "pt_1" }],
				page: 2,
				pageSize: 20,
				total: 1,
				totalPages: 1,
			} as never;
			vi.mocked(getPlayerHistory).mockResolvedValueOnce(mockHistoryResult);

			// Act
			const result = await loadPlayerHistory({
				page: 2,
				pageSize: 20,
				status: "COMPLETED",
				vodId: "vod_1",
			});

			// Assert
			expect(getPlayerHistory).toHaveBeenCalledWith({
				data: {
					page: 2,
					pageSize: 20,
					status: "COMPLETED",
					vodId: "vod_1",
				},
			});
			expect(result).toEqual({
				data: mockHistoryResult,
				error: null,
			});
		});

		it("falls back to undefined fields when deps are undefined", async () => {
			// Arrange
			const mockHistoryResult = {
				items: [],
				page: 1,
				pageSize: 10,
				total: 0,
				totalPages: 0,
			} as never;
			vi.mocked(getPlayerHistory).mockResolvedValueOnce(mockHistoryResult);

			// Act
			const result = await loadPlayerHistory(undefined);

			// Assert
			expect(getPlayerHistory).toHaveBeenCalledWith({
				data: {
					page: undefined,
					pageSize: undefined,
					status: undefined,
					vodId: undefined,
				},
			});
			expect(result).toEqual({ data: mockHistoryResult, error: null });
		});

		it("catches error and returns undefined data with error message", async () => {
			// Arrange
			vi.mocked(getPlayerHistory).mockRejectedValueOnce(
				new Error("Network failed"),
			);

			// Act
			const result = await loadPlayerHistory();

			// Assert
			expect(result).toEqual({
				data: undefined,
				error: "Network failed",
			});
		});

		it("handles non-Error thrown objects gracefully", async () => {
			// Arrange
			vi.mocked(getPlayerHistory).mockRejectedValueOnce(
				"Unknown failure string",
			);

			// Act
			const result = await loadPlayerHistory();

			// Assert
			expect(result).toEqual({
				data: undefined,
				error: "Failed to load match history",
			});
		});
	});

	describe("loadHistoryIndexPage", () => {
		it("fetches published VODs, registration status, and player history concurrently", async () => {
			// Arrange
			const mockVods = [{ id: "vod_1", title: "VOD" }] as never;
			const mockHistoryResult = {
				items: [{ id: "pt_1" }],
				page: 1,
				pageSize: 10,
				total: 1,
				totalPages: 1,
			} as never;
			vi.mocked(getPublishedVods).mockResolvedValueOnce(mockVods);
			vi.mocked(getPlayerHistory).mockResolvedValueOnce(mockHistoryResult);

			// Act
			const result = await loadHistoryIndexPage({ deps: {} });

			// Assert
			expect(getPublishedVods).toHaveBeenCalled();
			expect(result).toEqual({
				data: mockHistoryResult,
				error: null,
				registrationEnabled: true,
				vods: mockVods,
			});
		});

		it("falls back to empty array if getPublishedVods returns null", async () => {
			// Arrange
			vi.mocked(getPublishedVods).mockResolvedValueOnce(null as never);
			const mockHistoryResult = {
				items: [],
				page: 1,
				pageSize: 10,
				total: 0,
				totalPages: 0,
			} as never;
			vi.mocked(getPlayerHistory).mockResolvedValueOnce(mockHistoryResult);

			// Act
			const result = await loadHistoryIndexPage({ deps: {} });

			// Assert
			expect(result.vods).toEqual([]);
		});
	});
});
