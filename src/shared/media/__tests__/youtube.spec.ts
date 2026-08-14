import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { YouTubeNamespace } from "../youtube";

function setYouTubeNamespace(namespace: YouTubeNamespace | undefined) {
	Object.defineProperty(window, "YT", {
		configurable: true,
		value: namespace,
	});
}

describe("loadYouTubeIframeApi", () => {
	beforeEach(() => {
		vi.resetModules();
		vi.spyOn(document.head, "appendChild").mockImplementation((node) => node);
	});

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
		window.onYouTubeIframeAPIReady?.();
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

	it("reuses an existing API without inserting a script", async () => {
		// Arrange
		const namespace = {
			Player: vi.fn(),
		} as unknown as YouTubeNamespace;
		setYouTubeNamespace(namespace);
		const appendScript = vi.mocked(document.head.appendChild);
		const { loadYouTubeIframeApi } = await import("../youtube");

		// Act
		const loadedNamespace = await loadYouTubeIframeApi();

		// Assert
		expect(loadedNamespace).toBe(namespace);
		expect(appendScript).not.toHaveBeenCalled();
	});

	it("inserts one official async script and resolves when the API is ready", async () => {
		// Arrange
		const namespace = {
			Player: vi.fn(),
		} as unknown as YouTubeNamespace;
		const appendScript = vi.mocked(document.head.appendChild);
		const { loadYouTubeIframeApi } = await import("../youtube");

		// Act
		const load = loadYouTubeIframeApi();
		const secondLoad = loadYouTubeIframeApi();
		const [script] = appendScript.mock.calls[0] as [HTMLScriptElement];
		setYouTubeNamespace(namespace);
		window.onYouTubeIframeAPIReady?.();
		const loadedNamespace = await load;

		// Assert
		expect(secondLoad).toBe(load);
		expect(appendScript).toHaveBeenCalledTimes(1);
		expect(script.src).toBe("https://www.youtube.com/iframe_api");
		expect(script.async).toBe(true);
		expect(loadedNamespace).toBe(namespace);
	});

	it("reuses an existing script and resolves after its load event", async () => {
		// Arrange
		const namespace = {
			Player: vi.fn(),
		} as unknown as YouTubeNamespace;
		const existingScript = document.createElement("script");
		existingScript.src = "https://www.youtube.com/iframe_api";
		vi.spyOn(document, "querySelector").mockReturnValue(existingScript);
		const { loadYouTubeIframeApi } = await import("../youtube");

		// Act
		const load = loadYouTubeIframeApi();
		setYouTubeNamespace(namespace);
		existingScript.onload?.(new Event("load"));
		const loadedNamespace = await load;

		// Assert
		expect(existingScript.src).toBe("https://www.youtube.com/iframe_api");
		expect(loadedNamespace).toBe(namespace);
	});

	it("calls a pre-existing API-ready handler before resolving its own load", async () => {
		// Arrange
		const namespace = {
			Player: vi.fn(),
		} as unknown as YouTubeNamespace;
		const previousReadyHandler = vi.fn();
		window.onYouTubeIframeAPIReady = previousReadyHandler;
		const appendScript = vi.mocked(document.head.appendChild);
		const { loadYouTubeIframeApi } = await import("../youtube");

		// Act
		const load = loadYouTubeIframeApi();
		setYouTubeNamespace(namespace);
		window.onYouTubeIframeAPIReady?.();
		const loadedNamespace = await load;

		// Assert
		expect(previousReadyHandler).toHaveBeenCalledTimes(1);
		expect(appendScript).toHaveBeenCalledTimes(1);
		expect(loadedNamespace).toBe(namespace);
	});

	it("rejects a failed script load and clears the pending singleton", async () => {
		// Arrange
		const appendScript = vi.mocked(document.head.appendChild);
		const { loadYouTubeIframeApi } = await import("../youtube");

		// Act
		const load = loadYouTubeIframeApi();
		const [script] = appendScript.mock.calls[0] as [HTMLScriptElement];
		script.onerror?.(new Event("error"));

		// Assert
		await expect(load).rejects.toThrow(
			"The YouTube IFrame API failed to load.",
		);
	});
});
