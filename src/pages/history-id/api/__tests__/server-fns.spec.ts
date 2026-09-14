/**
 * Tests server functions and validation for playthrough history detail retrieval.
 *
 * Verifies payload parsing, invalid payload rejections, and handler execution delegating to getHistoryDetailRule.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start");
vi.mock("../../model/get-history-detail");

import { getHistoryDetailRule } from "../../model/get-history-detail";
import { getPlaythroughHistoryDetail } from "../server-fns";

describe("history-id server-fns", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("executes handler and fetches detail data", async () => {
		// Arrange
		const mockDetail = { data: { id: "pt_1" }, status: "success" as const };
		vi.mocked(getHistoryDetailRule).mockResolvedValueOnce(mockDetail as never);

		// Act
		const result = await (
			getPlaythroughHistoryDetail as unknown as (ctx: {
				data: { id: string };
			}) => Promise<unknown>
		)({ data: { id: "pt_1" } });

		// Assert
		expect(getHistoryDetailRule).toHaveBeenCalledWith({ id: "pt_1" });
		expect(result).toBe(mockDetail);
	});

	it("throws error when payload validation fails", async () => {
		// Arrange
		const invalidPayload = { id: "" };

		// Act & Assert
		await expect(
			(
				getPlaythroughHistoryDetail as unknown as (ctx: {
					data: unknown;
				}) => Promise<unknown>
			)({ data: invalidPayload }),
		).rejects.toThrow("Invalid playthrough detail query payload");
	});
});
