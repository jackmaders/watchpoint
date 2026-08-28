import { beforeEach, describe, expect, it, vi } from "vitest";
import { vodService } from "@/shared/db";
import { getPublishedVods } from "../server-fns";

vi.mock("@tanstack/react-start");
vi.mock("@/shared/db");

describe("vods server-fns", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("executes getPublishedVods handler correctly", async () => {
		// Arrange
		const mockVods = [
			{ id: "vod_1", title: "VOD 1" },
			{ id: "vod_2", title: "VOD 2" },
		] as never;
		vi.mocked(vodService.listPublished).mockResolvedValueOnce({
			data: mockVods,
			success: true,
		} as never);

		// Act
		const result = await (
			getPublishedVods as unknown as () => Promise<unknown>
		)();

		// Assert
		expect(vodService.listPublished).toHaveBeenCalled();
		expect(result).toEqual(mockVods);
	});

	it("throws error when dbGetPublishedVods fails", async () => {
		// Arrange
		vi.mocked(vodService.listPublished).mockResolvedValueOnce({
			error: "Failed to query VODs",
			success: false,
		});

		// Act & Assert
		await expect(
			(getPublishedVods as unknown as () => Promise<unknown>)(),
		).rejects.toThrow("Failed to query VODs");
	});
});
