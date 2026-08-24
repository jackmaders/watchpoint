import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start");
vi.mock("../history-id");

import { getPlaythroughHistoryDetailData } from "../history-id";
import { getPlaythroughHistoryDetail } from "../server-fns";

describe("history-id server-fns", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("executes handler and fetches detail data", async () => {
		// Arrange
		const mockDetail = { id: "pt_1" };
		vi.mocked(getPlaythroughHistoryDetailData).mockResolvedValueOnce(
			mockDetail as never,
		);

		// Act
		const result = await (
			getPlaythroughHistoryDetail as unknown as (ctx: {
				data: { id: string };
			}) => Promise<unknown>
		)({ data: { id: "pt_1" } });

		// Assert
		expect(getPlaythroughHistoryDetailData).toHaveBeenCalledWith("pt_1");
		expect(result).toBe(mockDetail);
	});
});
