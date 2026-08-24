import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router");
vi.mock("@/entities/vod");

import { notFound } from "@tanstack/react-router";
import { getVodById } from "@/entities/vod";
import { loadVodsIdPage } from "../loaders";

describe("vods-id loaders", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("loads VOD successfully by id", async () => {
		// Arrange
		const mockVod = { id: "vod_1", title: "VOD 1" } as never;
		vi.mocked(getVodById).mockResolvedValueOnce(mockVod);

		// Act
		const result = await loadVodsIdPage({ params: { id: "vod_1" } });

		// Assert
		expect(getVodById).toHaveBeenCalledWith({ data: { id: "vod_1" } });
		expect(result).toEqual({ vod: mockVod });
	});

	it("throws notFound error when VOD is not found", async () => {
		// Arrange
		vi.mocked(getVodById).mockResolvedValueOnce(null);

		// Act & Assert
		await expect(
			loadVodsIdPage({ params: { id: "vod_missing" } }),
		).rejects.toThrow();
		expect(notFound).toHaveBeenCalled();
	});
});
