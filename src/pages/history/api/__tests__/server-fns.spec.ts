/**
 * Tests server functions and validation for player history retrieval.
 *
 * Verifies payload parsing, invalid payload rejections, and handler execution delegating to getHistoryRule.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start");
vi.mock("../../model/get-history");

import { getHistoryRule } from "../../model/get-history";
import { getPlayerHistory } from "../server-fns";

describe("history server-fns", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("executes getPlayerHistory handler with data", async () => {
		// Arrange
		const mockResult = {
			data: { items: [], page: 1, pageSize: 10, total: 0, totalPages: 0 },
			status: "success" as const,
		};
		vi.mocked(getHistoryRule).mockResolvedValueOnce(mockResult as never);

		// Act
		const result = await (
			getPlayerHistory as unknown as (ctx: {
				data: { page: number };
			}) => Promise<unknown>
		)({ data: { page: 1 } });

		// Assert
		expect(getHistoryRule).toHaveBeenCalledWith({ page: 1 });
		expect(result).toBe(mockResult);
	});

	it("executes getPlayerHistory validator with empty payload", async () => {
		// Arrange
		const mockResult = {
			data: { items: [], page: 1, pageSize: 10, total: 0, totalPages: 0 },
			status: "success" as const,
		};
		vi.mocked(getHistoryRule).mockResolvedValueOnce(mockResult as never);

		// Act
		const result = await (
			getPlayerHistory as unknown as (ctx?: {
				data?: unknown;
			}) => Promise<unknown>
		)();

		// Assert
		expect(getHistoryRule).toHaveBeenCalledWith({});
		expect(result).toBe(mockResult);
	});

	it("throws error when payload validation fails", async () => {
		// Arrange
		const invalidPayload = { status: "INVALID_STATUS" };

		// Act & Assert
		await expect(
			(
				getPlayerHistory as unknown as (ctx: {
					data: unknown;
				}) => Promise<unknown>
			)({ data: invalidPayload }),
		).rejects.toThrow("Invalid player history query payload");
	});
});
