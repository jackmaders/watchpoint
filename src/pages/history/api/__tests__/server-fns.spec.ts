import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	getPlayerHistoryData,
	getPlaythroughHistoryDetailData,
} from "../history";
import { getPlayerHistory, getPlaythroughHistoryDetail } from "../server-fns";

vi.mock("@tanstack/react-start");
vi.mock("../history");

describe("History server functions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("executes getPlayerHistory server function with payload", async () => {
		// Arrange
		const mockResult = {
			items: [],
			page: 1,
			pageSize: 10,
			total: 0,
			totalPages: 1,
		};
		vi.mocked(getPlayerHistoryData).mockResolvedValueOnce(mockResult);

		// Act
		const result = await getPlayerHistory({
			data: {
				modules: ["STRATEGY"],
				page: 1,
				pageSize: 10,
				status: "COMPLETED",
				vodId: "vod_1",
			},
		});

		// Assert
		expect(result).toEqual(mockResult);
		expect(getPlayerHistoryData).toHaveBeenCalledWith({
			modules: ["STRATEGY"],
			page: 1,
			pageSize: 10,
			status: "COMPLETED",
			vodId: "vod_1",
		});
	});

	it("executes getPlayerHistory server function with default empty payload when data is undefined", async () => {
		// Arrange
		const mockResult = {
			items: [],
			page: 1,
			pageSize: 10,
			total: 0,
			totalPages: 1,
		};
		vi.mocked(getPlayerHistoryData).mockResolvedValueOnce(mockResult);

		// Act
		const result = await getPlayerHistory();

		// Assert
		expect(result).toEqual(mockResult);
		expect(getPlayerHistoryData).toHaveBeenCalledWith({});
	});

	it("executes getPlaythroughHistoryDetail server function with playthroughId", async () => {
		// Arrange
		const mockDetail = {
			accuracy: 100,
			id: "run_1",
			medianLatencyMs: 1200,
		};
		vi.mocked(getPlaythroughHistoryDetailData).mockResolvedValueOnce(
			mockDetail as never,
		);

		// Act
		const result = await getPlaythroughHistoryDetail({
			data: {
				playthroughId: "run_1",
			},
		});

		// Assert
		expect(result).toEqual(mockDetail);
		expect(getPlaythroughHistoryDetailData).toHaveBeenCalledWith("run_1");
	});
});
