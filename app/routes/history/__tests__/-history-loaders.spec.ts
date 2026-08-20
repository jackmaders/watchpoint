import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPlayerHistory, getPlaythroughHistoryDetail } from "@/pages/history";
import { getPublishedVods } from "@/pages/vods";
import { Route as HistoryDetailRoute } from "../$playthroughId";
import { Route as HistoryRoute } from "../index";

vi.mock("@tanstack/react-router");
vi.mock("@/pages/history");
vi.mock("@/pages/vods");

describe("History route loaders", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("HistoryRoute loader and search validation", () => {
		it("provides search parameter validator adapter", () => {
			// Arrange & Act & Assert
			expect(HistoryRoute.options.validateSearch).toBeDefined();
		});

		it("loads published vods and history data on success", async () => {
			// Arrange
			const mockVods = [{ id: "vod_1" }] as never;
			const mockHistory = {
				items: [],
				page: 1,
				pageSize: 10,
				total: 0,
				totalPages: 1,
			};
			vi.mocked(getPublishedVods).mockResolvedValueOnce(mockVods);
			vi.mocked(getPlayerHistory).mockResolvedValueOnce(mockHistory);

			const loader = HistoryRoute.options.loader as unknown as (context: {
				deps: { page?: number; status?: string };
			}) => Promise<unknown>;

			// Act
			const result = await loader({
				deps: { page: 1, status: "COMPLETED" },
			});

			// Assert
			expect(getPublishedVods).toHaveBeenCalled();
			expect(getPlayerHistory).toHaveBeenCalledWith({
				data: expect.objectContaining({ page: 1, status: "COMPLETED" }),
			});
			expect(result).toMatchObject({
				data: mockHistory,
				error: null,
				vods: mockVods,
			});
		});

		it("catches error from getPlayerHistory and provides fallback error state", async () => {
			// Arrange
			vi.mocked(getPublishedVods).mockResolvedValueOnce([]);
			vi.mocked(getPlayerHistory).mockRejectedValueOnce(
				new Error("Authentication required"),
			);

			const loader = HistoryRoute.options.loader as unknown as (context: {
				deps: Record<string, unknown>;
			}) => Promise<unknown>;

			// Act
			const result = await loader({ deps: {} });

			// Assert
			expect(result).toMatchObject({
				error: "Authentication required",
			});
		});
	});

	describe("HistoryDetailRoute loader", () => {
		it("loads playthrough detail by identifier", async () => {
			// Arrange
			const mockDetail = { accuracy: 80, id: "playthrough_1" } as never;
			vi.mocked(getPlaythroughHistoryDetail).mockResolvedValueOnce(mockDetail);

			const loader = HistoryDetailRoute.options.loader as unknown as (context: {
				params: { playthroughId: string };
			}) => Promise<unknown>;

			// Act
			const result = await loader({
				params: { playthroughId: "playthrough_1" },
			});

			// Assert
			expect(getPlaythroughHistoryDetail).toHaveBeenCalledWith({
				data: { playthroughId: "playthrough_1" },
			});
			expect(result).toEqual({
				error: null,
				playthrough: mockDetail,
			});
		});

		it("catches error in detail loader and returns error message", async () => {
			// Arrange
			vi.mocked(getPlaythroughHistoryDetail).mockRejectedValueOnce(
				new Error("Network failure"),
			);

			const loader = HistoryDetailRoute.options.loader as unknown as (context: {
				params: { playthroughId: string };
			}) => Promise<unknown>;

			// Act
			const result = await loader({
				params: { playthroughId: "playthrough_1" },
			});

			// Assert
			expect(result).toEqual({
				error: "Network failure",
				playthrough: null,
			});
		});
	});
});
