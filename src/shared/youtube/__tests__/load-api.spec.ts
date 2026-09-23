import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { loadYouTubeIframeApi, resetYouTubeIframeApiLoader } from "../load-api";

describe("loadYouTubeIframeApi", () => {
	const originalYT = window.YT;
	const originalOnYouTubeIframeAPIReady = window.onYouTubeIframeAPIReady;

	beforeEach(() => {
		resetYouTubeIframeApiLoader();
		Reflect.deleteProperty(window, "YT");
		Reflect.deleteProperty(window, "onYouTubeIframeAPIReady");
		const scripts = document.querySelectorAll("script");
		for (const script of scripts) {
			if (script.src.includes("youtube.com/iframe_api")) {
				script.remove();
			}
		}
	});

	afterEach(() => {
		window.YT = originalYT;
		window.onYouTubeIframeAPIReady = originalOnYouTubeIframeAPIReady;
		vi.restoreAllMocks();
	});

	test("resolves immediately if window.YT and window.YT.Player already exist", async () => {
		// biome-ignore lint/style/useNamingConvention: YouTube mock object
		// biome-ignore lint/nursery/noUnsafeTypeAssertion: test mock
		const mockYT = {
			// biome-ignore lint/style/useNamingConvention: YouTube API constructor
			Player: vi.fn(),
			// biome-ignore lint/style/useNamingConvention: YouTube API enum
			PlayerState: {
				// biome-ignore lint/style/useNamingConvention: enum member
				PLAYING: 1,
				// biome-ignore lint/style/useNamingConvention: enum member
				PAUSED: 2,
			},
		} as unknown as typeof YT;
		window.YT = mockYT;

		const result = await loadYouTubeIframeApi();
		expect(result).toBe(mockYT);
		const found = Array.from(document.querySelectorAll("script")).some((s) =>
			s.src.includes("youtube.com/iframe_api"),
		);
		expect(found).toBe(false);
	});

	test("injects script tag and resolves when onYouTubeIframeAPIReady is triggered", async () => {
		const appendSpy = vi
			.spyOn(document.head, "appendChild")
			.mockImplementation((node) => {
				if (node instanceof HTMLScriptElement) {
					Object.defineProperty(node, "src", {
						value: "https://www.youtube.com/iframe_api",
						writable: true,
					});
				}
				return node;
			});

		const loadPromise = loadYouTubeIframeApi();
		expect(appendSpy).toHaveBeenCalledTimes(1);

		// biome-ignore lint/style/useNamingConvention: YouTube mock object
		// biome-ignore lint/nursery/noUnsafeTypeAssertion: test mock
		const mockYT = {
			// biome-ignore lint/style/useNamingConvention: YouTube API constructor
			Player: vi.fn(),
			// biome-ignore lint/style/useNamingConvention: YouTube API enum
			PlayerState: {
				// biome-ignore lint/style/useNamingConvention: enum member
				PLAYING: 1,
				// biome-ignore lint/style/useNamingConvention: enum member
				PAUSED: 2,
			},
		} as unknown as typeof YT;
		window.YT = mockYT;

		// Trigger callback
		window.onYouTubeIframeAPIReady?.();

		const result = await loadPromise;
		expect(result).toBe(mockYT);
	});

	test("deduplicates concurrent calls into a single script insertion", async () => {
		const appendSpy = vi
			.spyOn(document.head, "appendChild")
			.mockImplementation((node) => {
				if (node instanceof HTMLScriptElement) {
					Object.defineProperty(node, "src", {
						value: "https://www.youtube.com/iframe_api",
						writable: true,
					});
				}
				return node;
			});

		const promise1 = loadYouTubeIframeApi();
		const promise2 = loadYouTubeIframeApi();

		expect(appendSpy).toHaveBeenCalledTimes(1);

		// biome-ignore lint/style/useNamingConvention: YouTube mock object
		// biome-ignore lint/nursery/noUnsafeTypeAssertion: test mock
		const mockYT = {
			// biome-ignore lint/style/useNamingConvention: YouTube API constructor
			Player: vi.fn(),
		} as unknown as typeof YT;
		window.YT = mockYT;
		window.onYouTubeIframeAPIReady?.();

		const [res1, res2] = await Promise.all([promise1, promise2]);
		expect(res1).toBe(mockYT);
		expect(res2).toBe(mockYT);
	});
});
