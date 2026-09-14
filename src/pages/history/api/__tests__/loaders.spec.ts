/**
 * Tests loaders and query options for match history retrieval and page preparation.
 *
 * Verifies cache warming with staleTime static, concurrent fetching of VODs and registration state,
 * queryFn execution, and result formatting from server function responses.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/entities/vod");
vi.mock("@/shared/lib/auth");
vi.mock("../server-fns");

import { getPublishedVods } from "@/entities/vod";
import { isRegistrationOpen } from "@/shared/lib/auth";
import {
	historyQueryOptions,
	loadHistoryIndexPage,
	loadPlayerHistory,
} from "../loaders";
import { getPlayerHistory } from "../server-fns";

describe("history loaders", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(isRegistrationOpen).mockResolvedValue(true);
	});

	describe("historyQueryOptions", () => {
		it("creates query options with parameters and key", () => {
			// Arrange
			const deps = { page: 2, pageSize: 20, status: "COMPLETED" as const };

			// Act
			const options = historyQueryOptions(deps);

			// Assert
			expect(options.queryKey).toEqual(["history", deps]);
		});

		it("creates default query key when deps is undefined or empty", () => {
			// Act
			const options = historyQueryOptions();

			// Assert
			expect(options.queryKey).toEqual(["history"]);
		});

		it("executes queryFn delegating to getPlayerHistory", async () => {
			// Arrange
			const mockHistoryResult = {
				data: { items: [], page: 1, pageSize: 10, total: 0, totalPages: 0 },
				status: "success" as const,
			};
			vi.mocked(getPlayerHistory).mockResolvedValueOnce(
				mockHistoryResult as never,
			);
			const options = historyQueryOptions({
				modules: ["STRATEGY"],
				page: 1,
				pageSize: 10,
				status: "COMPLETED",
				vodId: "vod_1",
			});

			// Act
			const result = await (options.queryFn as () => Promise<unknown>)();

			// Assert
			expect(getPlayerHistory).toHaveBeenCalledWith({
				data: {
					modules: ["STRATEGY"],
					page: 1,
					pageSize: 10,
					status: "COMPLETED",
					vodId: "vod_1",
				},
			});
			expect(result).toBe(mockHistoryResult);
		});

		it("executes queryFn when deps is undefined or modules is not provided", async () => {
			// Arrange
			const mockHistoryResult = {
				data: { items: [], page: 1, pageSize: 10, total: 0, totalPages: 0 },
				status: "success" as const,
			};
			vi.mocked(getPlayerHistory).mockResolvedValueOnce(
				mockHistoryResult as never,
			);
			const options = historyQueryOptions();

			// Act
			const result = await (options.queryFn as () => Promise<unknown>)();

			// Assert
			expect(getPlayerHistory).toHaveBeenCalledWith({
				data: {
					modules: undefined,
					page: undefined,
					pageSize: undefined,
					status: undefined,
					vodId: undefined,
				},
			});
			expect(result).toBe(mockHistoryResult);
		});
	});

	describe("loadPlayerHistory", () => {
		it("fetches player history with search params and maps success", async () => {
			// Arrange
			const mockHistoryResult = {
				items: [{ id: "pt_1" }],
				page: 2,
				pageSize: 20,
				total: 1,
				totalPages: 1,
			};
			vi.mocked(getPlayerHistory).mockResolvedValueOnce({
				data: mockHistoryResult as never,
				status: "success",
			});

			// Act
			const result = await loadPlayerHistory({
				modules: ["STRATEGY"],
				page: 2,
				pageSize: 20,
				status: "COMPLETED",
				vodId: "vod_1",
			});

			// Assert
			expect(getPlayerHistory).toHaveBeenCalledWith({
				data: {
					modules: ["STRATEGY"],
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

		it("returns error message when getPlayerHistory returns rejected", async () => {
			// Arrange
			vi.mocked(getPlayerHistory).mockResolvedValueOnce({
				reason: "Failed to load",
				status: "rejected",
			});

			// Act
			const result = await loadPlayerHistory();

			// Assert
			expect(result).toEqual({
				data: undefined,
				error: "Failed to load",
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
			};
			vi.mocked(getPublishedVods).mockResolvedValueOnce(mockVods);
			vi.mocked(getPlayerHistory).mockResolvedValueOnce({
				data: mockHistoryResult as never,
				status: "success",
			});

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

		it("warms query cache when queryClient context is present", async () => {
			// Arrange
			const mockQuery = vi.fn().mockResolvedValueOnce(undefined);
			const mockContext = {
				queryClient: {
					query: mockQuery,
				} as never,
			};
			const mockVods = [{ id: "vod_1", title: "VOD" }] as never;
			vi.mocked(getPublishedVods).mockResolvedValueOnce(mockVods);
			vi.mocked(getPlayerHistory).mockResolvedValueOnce({
				data: {
					items: [],
					page: 1,
					pageSize: 10,
					total: 0,
					totalPages: 0,
				} as never,
				status: "success",
			});

			// Act
			await loadHistoryIndexPage({
				context: mockContext,
				deps: { page: 1 },
			});

			// Assert
			expect(mockQuery).toHaveBeenCalledWith(
				expect.objectContaining({
					staleTime: "static",
				}),
			);
		});

		it("falls back to empty array if getPublishedVods returns null", async () => {
			// Arrange
			vi.mocked(getPublishedVods).mockResolvedValueOnce(null as never);
			vi.mocked(getPlayerHistory).mockResolvedValueOnce({
				data: {
					items: [],
					page: 1,
					pageSize: 10,
					total: 0,
					totalPages: 0,
				} as never,
				status: "success",
			});

			// Act
			const result = await loadHistoryIndexPage({ deps: {} });

			// Assert
			expect(result.vods).toEqual([]);
		});
	});
});
