// @vitest-environment node

import { describe, expect, it } from "vitest";

describe("YouTube adapter server boundary", () => {
	it("can be imported and reports that loading requires a browser", async () => {
		// Arrange
		const { loadYouTubeIframeApi } = await import("../youtube-adapter");

		// Act
		const load = loadYouTubeIframeApi();

		// Assert
		await expect(load).rejects.toThrow(
			"The YouTube IFrame API can only load in a browser.",
		);
	});
});
