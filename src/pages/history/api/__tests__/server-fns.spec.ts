import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start");
vi.mock("../history");

import { getPlayerHistoryData } from "../history";
import { getPlayerHistory } from "../server-fns";

describe("history server-fns", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("executes getPlayerHistory handler with data", async () => {
		// Arrange
		const mockResult = { items: [], total: 0 };
		vi.mocked(getPlayerHistoryData).mockResolvedValueOnce(mockResult as never);

		// Act
		const result = await (
			getPlayerHistory as unknown as (ctx: {
				data: { limit: number };
			}) => Promise<unknown>
		)({ data: { limit: 10 } });

		// Assert
		expect(getPlayerHistoryData).toHaveBeenCalledWith({ limit: 10 });
		expect(result).toBe(mockResult);
	});

	it("executes getPlayerHistory validator with undefined payload", async () => {
		// Arrange
		const mockResult = { items: [], total: 0 };
		vi.mocked(getPlayerHistoryData).mockResolvedValueOnce(mockResult as never);

		// Act
		const result = await (
			getPlayerHistory as unknown as (ctx?: {
				data?: unknown;
			}) => Promise<unknown>
		)();

		// Assert
		expect(getPlayerHistoryData).toHaveBeenCalledWith({});
		expect(result).toBe(mockResult);
	});
});
