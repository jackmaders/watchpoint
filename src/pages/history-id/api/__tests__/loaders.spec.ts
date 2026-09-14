/**
 * Tests loaders and query options for playthrough detail retrieval.
 *
 * Verifies cache warming with staleTime static, queryFn execution, and result formatting from server functions.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../server-fns");

import { historyDetailQueryOptions, loadHistoryIdPage } from "../loaders";
import { getPlaythroughHistoryDetail } from "../server-fns";

describe("history-id loaders", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("historyDetailQueryOptions", () => {
		it("creates query options with id and key", () => {
			// Act
			const options = historyDetailQueryOptions("pt_1");

			// Assert
			expect(options.queryKey).toEqual(["history-detail", "pt_1"]);
		});

		it("executes queryFn delegating to getPlaythroughHistoryDetail", async () => {
			// Arrange
			const mockPlaythrough = { accuracy: 90, id: "pt_1" };
			vi.mocked(getPlaythroughHistoryDetail).mockResolvedValueOnce({
				data: mockPlaythrough as never,
				status: "success",
			});
			const options = historyDetailQueryOptions("pt_1");

			// Act
			const result = await (options.queryFn as () => Promise<unknown>)();

			// Assert
			expect(getPlaythroughHistoryDetail).toHaveBeenCalledWith({
				data: { id: "pt_1" },
			});
			expect(result).toEqual({
				data: mockPlaythrough,
				status: "success",
			});
		});
	});

	describe("loadHistoryIdPage", () => {
		it("loads playthrough detail successfully", async () => {
			// Arrange
			const mockPlaythrough = { accuracy: 90, id: "pt_1" };
			vi.mocked(getPlaythroughHistoryDetail).mockResolvedValueOnce({
				data: mockPlaythrough as never,
				status: "success",
			});

			// Act
			const result = await loadHistoryIdPage({
				params: { id: "pt_1" },
			});

			// Assert
			expect(getPlaythroughHistoryDetail).toHaveBeenCalledWith({
				data: { id: "pt_1" },
			});
			expect(result).toEqual({
				error: null,
				playthrough: mockPlaythrough,
			});
		});

		it("warms query cache when context queryClient is provided", async () => {
			// Arrange
			const mockQuery = vi.fn().mockResolvedValueOnce(undefined);
			const mockContext = {
				queryClient: {
					query: mockQuery,
				} as never,
			};
			const mockPlaythrough = { accuracy: 90, id: "pt_1" };
			vi.mocked(getPlaythroughHistoryDetail).mockResolvedValueOnce({
				data: mockPlaythrough as never,
				status: "success",
			});

			// Act
			const result = await loadHistoryIdPage({
				context: mockContext,
				params: { id: "pt_1" },
			});

			// Assert
			expect(mockQuery).toHaveBeenCalledWith(
				expect.objectContaining({
					staleTime: "static",
				}),
			);
			expect(result).toEqual({
				error: null,
				playthrough: mockPlaythrough,
			});
		});

		it("returns error message when server function returns rejected", async () => {
			// Arrange
			vi.mocked(getPlaythroughHistoryDetail).mockResolvedValueOnce({
				reason: "Not found",
				status: "rejected",
			});

			// Act
			const result = await loadHistoryIdPage({
				params: { id: "pt_invalid" },
			});

			// Assert
			expect(result).toEqual({
				error: "Not found",
				playthrough: null,
			});
		});
	});
});
