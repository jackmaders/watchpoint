import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/db");
vi.mock("@/shared/lib/auth");

import { getPlaythroughHistoryDetail } from "@/shared/db";
import { getCurrentUser } from "@/shared/lib/auth";
import { getPlaythroughHistoryDetailData } from "../history-id";

describe("getPlaythroughHistoryDetailData", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("fetches playthrough history detail for authenticated user", async () => {
		// Arrange
		const mockUser = { id: "usr_1" };
		const mockItem = { accuracy: 95, id: "pt_1" };
		vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as never);
		vi.mocked(getPlaythroughHistoryDetail).mockResolvedValueOnce(
			mockItem as never,
		);

		// Act
		const result = await getPlaythroughHistoryDetailData("pt_1");

		// Assert
		expect(getCurrentUser).toHaveBeenCalled();
		expect(getPlaythroughHistoryDetail).toHaveBeenCalledWith(
			"pt_1",
			"usr_1",
			undefined,
		);
		expect(result).toEqual(mockItem);
	});

	it("throws error when user is not authenticated", async () => {
		// Arrange
		vi.mocked(getCurrentUser).mockResolvedValueOnce(null);

		// Act & Assert
		await expect(getPlaythroughHistoryDetailData("pt_1")).rejects.toThrow(
			"Authentication required",
		);
	});
});
