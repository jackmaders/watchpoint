import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createYouTubeMock, setYouTubeNamespace } from "../__mocks__/youtube";
import { PlaybackStatus } from "../types";
import type { YouTubeNamespace } from "../youtube-adapter";

describe("useVodPlayer loader failure boundary", () => {
	beforeEach(() => {
		vi.resetModules();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
		setYouTubeNamespace(undefined);
		document.head.replaceChildren();
		delete window.onYouTubeIframeAPIReady;
	});

	it("remains safely unready when the API script fails", async () => {
		// Arrange
		vi.spyOn(document.head, "appendChild").mockImplementation((node) => node);
		const { useVodPlayer } = await import("../use-vod-player");
		const youtube = createYouTubeMock();
		const container = document.createElement("div");

		// Act
		const { result } = renderHook(() =>
			useVodPlayer({ videoId: "failed-video" }),
		);
		act(() => {
			result.current.containerRef(container);
		});
		const [script] = vi.mocked(document.head.appendChild).mock.calls[0] as [
			HTMLScriptElement,
		];
		act(() => script.onerror?.(new Event("error")));
		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});

		// Assert
		expect(youtube.players).toHaveLength(0);
		expect(result.current.isReady).toBe(false);
		expect(result.current.duration).toBe(0);
		expect(result.current.status).toBe(PlaybackStatus.UNSTARTED);
	});

	it("ignores API readiness that arrives after unmount", async () => {
		// Arrange
		vi.spyOn(document.head, "appendChild").mockImplementation((node) => node);
		const { useVodPlayer } = await import("../use-vod-player");
		const youtube = createYouTubeMock();
		const container = document.createElement("div");
		const { result, unmount } = renderHook(() =>
			useVodPlayer({ videoId: "late-video" }),
		);
		act(() => {
			result.current.containerRef(container);
		});
		const [script] = vi.mocked(document.head.appendChild).mock.calls[0] as [
			HTMLScriptElement,
		];

		// Act
		unmount();
		act(() => script.onerror?.(new Event("error")));
		setYouTubeNamespace(youtube.namespace);
		window.onYouTubeIframeAPIReady?.();
		script.onload?.(new Event("load"));
		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});

		// Assert
		expect(youtube.players).toHaveLength(0);
	});

	it("reports readiness and prolonged buffering failures", async () => {
		// Arrange
		vi.useFakeTimers();
		const { useVodPlayer } = await import("../use-vod-player");
		const youtube = createYouTubeMock();
		setYouTubeNamespace(youtube.namespace);
		const onError = vi.fn();
		const container = document.createElement("div");
		const { result } = renderHook(() =>
			useVodPlayer({ onError, videoId: "failure-video" }),
		);
		act(() => result.current.containerRef(container));
		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});
		const player = youtube.players[0];

		// Act
		act(() => vi.advanceTimersByTime(5000));
		act(() => player.triggerStateChange(1));
		act(() => player.triggerReady());
		act(() => player.triggerStateChange(3));
		act(() => vi.advanceTimersByTime(5000));
		act(() => player.triggerStateChange(1));

		// Assert
		expect(onError).toHaveBeenNthCalledWith(1, {
			category: "readiness",
			message: "The media player did not become ready.",
		});
		expect(onError).toHaveBeenNthCalledWith(2, {
			category: "buffering",
			message: "The media player has been buffering for too long.",
		});
	});

	it("translates provider error callbacks into typed failures", async () => {
		// Arrange
		const { useVodPlayer } = await import("../use-vod-player");
		const youtube = createYouTubeMock();
		setYouTubeNamespace(youtube.namespace);
		const onError = vi.fn();
		const container = document.createElement("div");
		const { result, rerender } = renderHook(
			({ videoId }: { videoId: string }) => useVodPlayer({ onError, videoId }),
			{ initialProps: { videoId: "provider-error-video" } },
		);
		act(() => result.current.containerRef(container));
		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});
		const player = youtube.players[0];
		act(() => player.triggerReady());

		// Act
		act(() => player.options.events?.onError?.({ data: 150, target: player }));

		// Assert
		expect(onError).toHaveBeenCalledWith({
			category: "provider",
			code: "150",
			message: "The media provider reported a playback error.",
		});

		// Act
		rerender({ videoId: "next-video" });
		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});
		act(() => player.options.events?.onError?.({ data: 150, target: player }));

		// Assert
		expect(onError).toHaveBeenCalledTimes(1);
	});

	it("does not escalate buffering that ends in a user pause", async () => {
		// Arrange
		vi.useFakeTimers();
		const { useVodPlayer } = await import("../use-vod-player");
		const youtube = createYouTubeMock();
		setYouTubeNamespace(youtube.namespace);
		const onError = vi.fn();
		const container = document.createElement("div");
		const { result } = renderHook(() =>
			useVodPlayer({ onError, videoId: "paused-buffering-video" }),
		);
		act(() => result.current.containerRef(container));
		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});
		const player = youtube.players[0];
		act(() => player.triggerReady());

		// Act
		act(() => player.triggerStateChange(3));
		act(() => player.triggerStateChange(2));
		act(() => vi.advanceTimersByTime(5000));

		// Assert
		expect(onError).not.toHaveBeenCalled();
	});

	it("reports player construction failures", async () => {
		// Arrange
		const { useVodPlayer } = await import("../use-vod-player");
		const onError = vi.fn();
		setYouTubeNamespace({
			Player: class {
				constructor() {
					throw new Error("constructor failed");
				}
				destroy() {}
				getCurrentTime() {
					return 0;
				}
				getDuration() {
					return 0;
				}
				pauseVideo() {}
				playVideo() {}
				seekTo() {}
			} as unknown as YouTubeNamespace["Player"],
		});
		const container = document.createElement("div");
		const { result } = renderHook(() =>
			useVodPlayer({ onError, videoId: "construction-error-video" }),
		);

		// Act
		act(() => result.current.containerRef(container));
		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});

		// Assert
		expect(onError).toHaveBeenCalledWith({
			category: "player-construction",
			message: "constructor failed",
		});
	});
});
