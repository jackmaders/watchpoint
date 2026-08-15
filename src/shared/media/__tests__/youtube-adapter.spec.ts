import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setYouTubeNamespace } from "../__mocks__/youtube";
import { PlaybackStatus } from "../types";
import {
	createYouTubePlayerInstance,
	toPlaybackStatus,
	type YouTubeNamespace,
	YouTubePlayerState,
} from "../youtube-adapter";

describe("youtube-adapter", () => {
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

	describe("toPlaybackStatus", () => {
		it("maps all YouTube player states to domain PlaybackStatus values", () => {
			// Arrange & Act & Assert
			expect(toPlaybackStatus(YouTubePlayerState.UNSTARTED)).toBe(
				PlaybackStatus.UNSTARTED,
			);
			expect(toPlaybackStatus(YouTubePlayerState.ENDED)).toBe(
				PlaybackStatus.ENDED,
			);
			expect(toPlaybackStatus(YouTubePlayerState.PLAYING)).toBe(
				PlaybackStatus.PLAYING,
			);
			expect(toPlaybackStatus(YouTubePlayerState.PAUSED)).toBe(
				PlaybackStatus.PAUSED,
			);
			expect(toPlaybackStatus(YouTubePlayerState.BUFFERING)).toBe(
				PlaybackStatus.BUFFERING,
			);
			expect(toPlaybackStatus(YouTubePlayerState.CUED)).toBe(
				PlaybackStatus.CUED,
			);
			expect(toPlaybackStatus(999)).toBe(PlaybackStatus.UNSTARTED);
		});
	});

	describe("createYouTubePlayerInstance", () => {
		it("initializes a player with strict playerVars and event handlers", () => {
			// Arrange
			const PlayerConstructor = vi.fn();
			const youtube = {
				Player: PlayerConstructor as unknown as YouTubeNamespace["Player"],
			};
			const container = document.createElement("div");
			const handleReady = vi.fn();
			const handleStateChange = vi.fn();

			// Act
			createYouTubePlayerInstance({
				autoplay: true,
				container,
				handleReady,
				handleStateChange,
				videoId: "test-video",
				youtube,
			});

			// Assert
			expect(PlayerConstructor).toHaveBeenCalledWith(container, {
				events: {
					onReady: handleReady,
					onStateChange: handleStateChange,
				},
				playerVars: {
					autoplay: 1,
					controls: 0,
				},
				videoId: "test-video",
			});
		});

		it("disables autoplay when autoplay is false", () => {
			// Arrange
			const PlayerConstructor = vi.fn();
			const youtube = {
				Player: PlayerConstructor as unknown as YouTubeNamespace["Player"],
			};
			const container = document.createElement("div");

			// Act
			createYouTubePlayerInstance({
				autoplay: false,
				container,
				handleReady: vi.fn(),
				handleStateChange: vi.fn(),
				videoId: "test-video",
				youtube,
			});

			// Assert
			expect(PlayerConstructor).toHaveBeenCalledWith(container, {
				events: expect.any(Object),
				playerVars: {
					autoplay: 0,
					controls: 0,
				},
				videoId: "test-video",
			});
		});
	});

	describe("loadYouTubeIframeApi", () => {
		it("shares one pending load and resolves concurrent callers to the API namespace", async () => {
			// Arrange
			const namespace = {
				Player: vi.fn(),
			} as unknown as YouTubeNamespace;
			const { loadYouTubeIframeApi } = await import("../youtube-adapter");

			// Act
			const firstLoad = loadYouTubeIframeApi();
			window.onYouTubeIframeAPIReady?.();
			setYouTubeNamespace(namespace);
			const secondLoad = loadYouTubeIframeApi();
			window.onYouTubeIframeAPIReady?.();
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
			const { loadYouTubeIframeApi } = await import("../youtube-adapter");

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
			const { loadYouTubeIframeApi } = await import("../youtube-adapter");

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
			const { loadYouTubeIframeApi } = await import("../youtube-adapter");

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
			const { loadYouTubeIframeApi } = await import("../youtube-adapter");

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
			const { loadYouTubeIframeApi } = await import("../youtube-adapter");

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
});
