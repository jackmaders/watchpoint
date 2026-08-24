import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/widgets/admin-vod-editor");

import { getAdminVods } from "@/widgets/admin-vod-editor";
import { loadAdminContent } from "../loaders";

describe("admin-content loaders", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("loads admin content vods", async () => {
		// Arrange
		const mockVods = [{ id: "vod_1" }] as never;
		vi.mocked(getAdminVods).mockResolvedValueOnce(mockVods);

		// Act
		const result = await loadAdminContent();

		// Assert
		expect(getAdminVods).toHaveBeenCalled();
		expect(result).toEqual({ vods: mockVods });
	});
});
