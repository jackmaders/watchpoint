import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDbClient, queryVods } from "@/shared/db";
import { getPublishedVods } from "../server-fns";

vi.mock("@tanstack/react-start");
vi.mock("@/shared/db");

describe("vods server-fns", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(createDbClient).mockReturnValue({} as never);
	});

	it("executes getPublishedVods handler correctly", async () => {
		// Arrange
		const mockVods = [
			{ id: "vod_1", title: "VOD 1" },
			{ id: "vod_2", title: "VOD 2" },
		] as never;
		vi.mocked(queryVods).mockResolvedValueOnce(mockVods);

		// Act
		const result = await (
			getPublishedVods as unknown as () => Promise<unknown>
		)();

		// Assert
		expect(queryVods).toHaveBeenCalledWith(
			{
				filter: { isPublished: { eq: true } },
				order: { createdAt: "desc" },
			},
			expect.anything(),
		);
		expect(result).toEqual(mockVods);
	});

	it("throws error when queryVods fails", async () => {
		// Arrange
		vi.mocked(queryVods).mockRejectedValueOnce(
			new Error("Failed to query VODs"),
		);

		// Act & Assert
		await expect(
			(getPublishedVods as unknown as () => Promise<unknown>)(),
		).rejects.toThrow("Failed to query VODs");
	});
});
