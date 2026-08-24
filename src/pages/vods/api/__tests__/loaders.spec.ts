import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/entities/vod");
vi.mock("@/shared/lib/auth");

import { getPublishedVods } from "@/entities/vod";
import { isRegistrationOpen } from "@/shared/lib/auth";
import { loadVodsPage } from "../loaders";

describe("loadVodsPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("loads published vods and registration state", async () => {
		// Arrange
		const mockVods = [{ id: "vod_1" }] as never;
		vi.mocked(getPublishedVods).mockResolvedValueOnce(mockVods);
		vi.mocked(isRegistrationOpen).mockResolvedValueOnce(true);

		// Act
		const result = await loadVodsPage();

		// Assert
		expect(getPublishedVods).toHaveBeenCalled();
		expect(isRegistrationOpen).toHaveBeenCalled();
		expect(result).toEqual({
			registrationEnabled: true,
			vods: mockVods,
		});
	});
});
