import { afterEach, describe, expect, it, vi } from "vitest";
import type { YouTubeNamespace } from "../youtube";

function setYouTubeNamespace(namespace: YouTubeNamespace | undefined) {
	Object.defineProperty(window, "YT", {
		configurable: true,
		value: namespace,
	});
}

describe("loadYouTubeIframeApi", () => {
	afterEach(() => {
		vi.restoreAllMocks();
		setYouTubeNamespace(undefined);
		document.head.replaceChildren();
		delete window.onYouTubeIframeAPIReady;
	});

	it("shares one pending load and resolves concurrent callers to the API namespace", async () => {
		// Arrange
		const namespace = {
			Player: vi.fn(),
		} as unknown as YouTubeNamespace;
		const { loadYouTubeIframeApi } = await import("../youtube");

		// Act
		const firstLoad = loadYouTubeIframeApi();
		const secondLoad = loadYouTubeIframeApi();
		setYouTubeNamespace(namespace);
		window.onYouTubeIframeAPIReady?.();
		const [firstNamespace, secondNamespace] = await Promise.all([
			firstLoad,
			secondLoad,
		]);

		// Assert
		expect(firstLoad).toBe(secondLoad);
		expect(firstNamespace).toBe(namespace);
		expect(secondNamespace).toBe(namespace);
	});
});
