import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/entities/vod");
vi.mock("@/shared/lib/auth");

import { getPublishedVods } from "@/entities/vod";
import { isRegistrationOpen } from "@/shared/lib/auth";
import { loadHomePage } from "../loaders";

describe("loadHomePage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("loads published vods and registration status", async () => {
		// Arrange
		const mockVods = [{ id: "vod_1", title: "Test VOD" }] as never;
		vi.mocked(getPublishedVods).mockResolvedValueOnce(mockVods);
		vi.mocked(isRegistrationOpen).mockResolvedValueOnce(true);

		// Act
		const result = await loadHomePage();

		// Assert
		expect(getPublishedVods).toHaveBeenCalled();
		expect(isRegistrationOpen).toHaveBeenCalled();
		expect(result).toEqual({
			registrationEnabled: true,
			vods: mockVods,
		});
	});
});
