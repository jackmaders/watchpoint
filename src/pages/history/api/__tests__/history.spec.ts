import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/db");
vi.mock("@/shared/lib/auth");

import { queryPlayerHistory } from "@/shared/db";
import { getCurrentUser } from "@/shared/lib/auth";
import { getPlayerHistoryData } from "../history";

describe("getPlayerHistoryData", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("fetches player history for authenticated user with default options", async () => {
		// Arrange
		const mockUser = { id: "usr_1" };
		const mockResult = { items: [], total: 0 };
		vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as never);
		vi.mocked(queryPlayerHistory).mockResolvedValueOnce(mockResult as never);

		// Act
		const result = await getPlayerHistoryData();

		// Assert
		expect(getCurrentUser).toHaveBeenCalled();
		expect(queryPlayerHistory).toHaveBeenCalledWith("usr_1", {}, undefined);
		expect(result).toEqual(mockResult);
	});

	it("throws error when user is not authenticated", async () => {
		// Arrange
		vi.mocked(getCurrentUser).mockResolvedValueOnce(null);

		// Act & Assert
		await expect(getPlayerHistoryData()).rejects.toThrow(
			"Authentication required",
		);
	});
});
