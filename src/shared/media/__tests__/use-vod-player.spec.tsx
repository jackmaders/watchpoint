import { act, render, renderHook } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	createYouTubeMock,
	installMockFrames,
	setDocumentVisibility,
	setYouTubeNamespace,
} from "../__mocks__/youtube";
import { PlaybackStatus } from "../types";
import { YouTubePlayerState } from "../youtube-adapter";

describe("useVodPlayer", () => {
	beforeEach(() => {
		vi.resetModules();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		setYouTubeNamespace(undefined);
		document.head.replaceChildren();
		delete window.onYouTubeIframeAPIReady;
	});

	it("initializes as unready and transitions to ready when container mounts and player fires onReady", async () => {
		// Arrange
		const { useVodPlayer } = await import("../use-vod-player");
		const youtube = createYouTubeMock(142);
		setYouTubeNamespace(youtube.namespace);
		const onReady = vi.fn();
		const container = document.createElement("div");

		// Act
		const { result } = renderHook(() =>
			useVodPlayer({
				autoplay: true,
				onReady,
				videoId: "dQw4w9WgXcQ",
			}),
		);
		const initialState = { ...result.current };
		act(() => {
			result.current.containerRef(container);
		});
		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});
		const player = youtube.players[0];
		act(() => {
			player.triggerReady();
			player.triggerReady();
		});

		// Assert
		expect(initialState.isReady).toBe(false);
		expect(initialState.status).toBe(PlaybackStatus.UNSTARTED);
		expect(initialState.duration).toBe(0);
		expect(initialState.currentTime).toBe(0);
		expect(youtube.players).toHaveLength(1);
		expect(player.options).toEqual({
			events: expect.any(Object),
			playerVars: { autoplay: 1, controls: 0 },
			videoId: "dQw4w9WgXcQ",
		});
		expect(result.current.isReady).toBe(true);
		expect(result.current.duration).toBe(142);
		expect(result.current.currentTime).toBe(0);
		expect(onReady).toHaveBeenCalledTimes(1);
		expect(onReady).toHaveBeenCalledWith(142);
	});

	it("does not create a player without a mounted container", async () => {
		// Arrange
		const { useVodPlayer } = await import("../use-vod-player");
		const youtube = createYouTubeMock();
		setYouTubeNamespace(youtube.namespace);

		// Act
		const { result } = renderHook(() =>
			useVodPlayer({ videoId: "dQw4w9WgXcQ" }),
		);
		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});

		// Assert
		expect(youtube.players).toHaveLength(0);
		expect(result.current.isReady).toBe(false);
		expect(result.current.duration).toBe(0);
	});

	it("normalizes unsafe media values when the player becomes ready", async () => {
		// Arrange
		const { useVodPlayer } = await import("../use-vod-player");
		const youtube = createYouTubeMock();
		setYouTubeNamespace(youtube.namespace);
		const container = document.createElement("div");

		// Act
		const { result } = renderHook(() =>
			useVodPlayer({ videoId: "dQw4w9WgXcQ" }),
		);
		act(() => {
			result.current.containerRef(container);
		});
		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});
		const player = youtube.players[0];
		vi.mocked(player.getDuration).mockReturnValue(Number.NaN);
		vi.mocked(player.getCurrentTime).mockReturnValue(-1);
		act(() => player.triggerReady());

		// Assert
		expect(result.current.isReady).toBe(true);
		expect(result.current.duration).toBe(0);
		expect(result.current.currentTime).toBe(0);
	});

	it("destroys the old player and ignores its late ready callback when the VOD changes", async () => {
		// Arrange
		const { useVodPlayer } = await import("../use-vod-player");
		const youtube = createYouTubeMock();
		setYouTubeNamespace(youtube.namespace);
		const onReady = vi.fn();
		const container = document.createElement("div");
		const { result, rerender } = renderHook(
			({ videoId }: { videoId: string }) => useVodPlayer({ onReady, videoId }),
			{ initialProps: { videoId: "first-video" } },
		);
		act(() => {
			result.current.containerRef(container);
		});
		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});
		const firstPlayer = youtube.players[0];
		vi.mocked(firstPlayer.getDuration).mockReturnValue(10);

		// Act
		rerender({ videoId: "second-video" });
		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});
		const secondPlayer = youtube.players[1];
		vi.mocked(secondPlayer.getDuration).mockReturnValue(20);
		act(() => firstPlayer.triggerReady());
		act(() => secondPlayer.triggerReady());

		// Assert
		expect(youtube.players).toHaveLength(2);
		expect(firstPlayer.destroy).toHaveBeenCalledTimes(1);
		expect(secondPlayer.options.videoId).toBe("second-video");
		expect(result.current.isReady).toBe(true);
		expect(result.current.duration).toBe(20);
		expect(onReady).toHaveBeenCalledTimes(1);
		expect(onReady).toHaveBeenCalledWith(20);
	});

	it("cleans up its owned player when unmounted or container is detached", async () => {
		// Arrange
		const { useVodPlayer } = await import("../use-vod-player");
		const youtube = createYouTubeMock();
		setYouTubeNamespace(youtube.namespace);
		const onReady = vi.fn();
		const container = document.createElement("div");

		// Act
		const { result, unmount } = renderHook(() =>
			useVodPlayer({ onReady, videoId: "strict-video" }),
		);
		act(() => {
			result.current.containerRef(container);
		});
		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});
		const player = youtube.players[0];
		unmount();
		act(() => player.triggerReady());

		// Assert
		expect(youtube.players).toHaveLength(1);
		expect(player.destroy).toHaveBeenCalledTimes(1);
		expect(onReady).not.toHaveBeenCalled();
	});

	it("waits for a conditionally mounted container in a component", async () => {
		// Arrange
		const { useVodPlayer } = await import("../use-vod-player");
		const youtube = createYouTubeMock(142);
		setYouTubeNamespace(youtube.namespace);
		let latestState: ReturnType<typeof useVodPlayer> | undefined;
		function ConditionalPlayer({ show }: { show: boolean }) {
			const state = useVodPlayer({ videoId: "late-container" });
			latestState = state;
			return show ? <div ref={state.containerRef} /> : null;
		}
		const view = render(<ConditionalPlayer show={false} />);

		// Act
		view.rerender(<ConditionalPlayer show />);
		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});
		const player = youtube.players[0];
		act(() => player.triggerReady());

		// Assert
		expect(youtube.players).toHaveLength(1);
		expect(latestState?.isReady).toBe(true);
	});

	it("cleans up player when rendered in StrictMode", async () => {
		// Arrange
		const { useVodPlayer } = await import("../use-vod-player");
		const youtube = createYouTubeMock();
		setYouTubeNamespace(youtube.namespace);
		function StrictPlayer() {
			const state = useVodPlayer({ videoId: "strict-tree" });
			return (
				<StrictMode>
					<div ref={state.containerRef} />
				</StrictMode>
			);
		}

		// Act
		const { unmount } = render(<StrictPlayer />);
		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});
		const player = youtube.players[0];
		unmount();

		// Assert
		expect(player.destroy).toHaveBeenCalled();
	});

	it("safely ignores control commands before a player exists or becomes ready", async () => {
		// Arrange
		const { useVodPlayer } = await import("../use-vod-player");
		const youtube = createYouTubeMock();
		setYouTubeNamespace(youtube.namespace);
		const container = document.createElement("div");

		// Act
		const { result } = renderHook(() =>
			useVodPlayer({ videoId: "pre-ready-video" }),
		);
		result.current.play();
		result.current.pause();
		result.current.seekTo(10, false);
		result.current.replay();
		act(() => {
			result.current.containerRef(container);
		});
		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});
		const player = youtube.players[0];
		result.current.play();
		result.current.pause();
		result.current.seekTo(20, true);
		result.current.replay();

		// Assert
		expect(player.playVideo).not.toHaveBeenCalled();
		expect(player.pauseVideo).not.toHaveBeenCalled();
		expect(player.seekTo).not.toHaveBeenCalled();
	});

	it("delegates play, pause, and seekTo with defensive clamping once ready", async () => {
		// Arrange
		const { useVodPlayer } = await import("../use-vod-player");
		const youtube = createYouTubeMock(100);
		setYouTubeNamespace(youtube.namespace);
		const container = document.createElement("div");
		const { result } = renderHook(() =>
			useVodPlayer({ videoId: "ready-video" }),
		);
		act(() => {
			result.current.containerRef(container);
		});
		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});
		const player = youtube.players[0];
		act(() => player.triggerReady());

		// Act
		result.current.play();
		result.current.pause();
		result.current.seekTo(15);
		result.current.seekTo(30, false);
		result.current.seekTo(-10); // clamps to 0
		result.current.seekTo(150); // clamps to duration (100)
		result.current.seekTo(Number.NaN); // clamps to 0

		// Assert
		expect(player.playVideo).toHaveBeenCalledTimes(1);
		expect(player.pauseVideo).toHaveBeenCalledTimes(1);
		expect(player.seekTo).toHaveBeenNthCalledWith(1, 15, true);
		expect(player.seekTo).toHaveBeenNthCalledWith(2, 30, false);
		expect(player.seekTo).toHaveBeenNthCalledWith(3, 0, true);
		expect(player.seekTo).toHaveBeenNthCalledWith(4, 100, true);
		expect(player.seekTo).toHaveBeenNthCalledWith(5, 0, true);
	});

	it("executes replay as seek-to-zero followed by play in exact sequence", async () => {
		// Arrange
		const { useVodPlayer } = await import("../use-vod-player");
		const youtube = createYouTubeMock(142);
		setYouTubeNamespace(youtube.namespace);
		const container = document.createElement("div");
		const { result } = renderHook(() =>
			useVodPlayer({ videoId: "replay-video" }),
		);
		act(() => {
			result.current.containerRef(container);
		});
		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});
		const player = youtube.players[0];
		act(() => player.triggerReady());
		const callOrder: string[] = [];
		vi.mocked(player.seekTo).mockImplementation(() => {
			callOrder.push("seekTo(0, true)");
		});
		vi.mocked(player.playVideo).mockImplementation(() => {
			callOrder.push("playVideo()");
		});

		// Act
		result.current.replay();

		// Assert
		expect(callOrder).toEqual(["seekTo(0, true)", "playVideo()"]);
		expect(player.seekTo).toHaveBeenCalledWith(0, true);
		expect(player.playVideo).toHaveBeenCalledTimes(1);
	});

	it("tracks status transitions and forwards onStatusChange callbacks", async () => {
		// Arrange
		const { useVodPlayer } = await import("../use-vod-player");
		const youtube = createYouTubeMock(142);
		setYouTubeNamespace(youtube.namespace);
		const onStatusChange = vi.fn();
		const container = document.createElement("div");

		// Act
		const { result } = renderHook(() =>
			useVodPlayer({
				onStatusChange,
				videoId: "state-video",
			}),
		);
		const initialState = result.current.status;
		act(() => {
			result.current.containerRef(container);
		});
		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});
		const player = youtube.players[0];
		act(() => player.triggerReady());
		act(() => player.triggerStateChange(YouTubePlayerState.PLAYING));
		const playingState = result.current.status;
		act(() => player.triggerStateChange(YouTubePlayerState.PAUSED));
		const pausedState = result.current.status;

		// Assert
		expect(initialState).toBe(PlaybackStatus.UNSTARTED);
		expect(playingState).toBe(PlaybackStatus.PLAYING);
		expect(pausedState).toBe(PlaybackStatus.PAUSED);
		expect(onStatusChange).toHaveBeenCalledTimes(2);
		expect(onStatusChange).toHaveBeenNthCalledWith(1, PlaybackStatus.PLAYING);
		expect(onStatusChange).toHaveBeenNthCalledWith(2, PlaybackStatus.PAUSED);
	});

	it("resets status on VOD change and routes commands and events to the active player only", async () => {
		// Arrange
		const { useVodPlayer } = await import("../use-vod-player");
		const youtube = createYouTubeMock(142);
		setYouTubeNamespace(youtube.namespace);
		const onStatusChange = vi.fn();
		const container = document.createElement("div");
		const { result, rerender } = renderHook(
			({ videoId }: { videoId: string }) =>
				useVodPlayer({ onStatusChange, videoId }),
			{ initialProps: { videoId: "vod-alpha" } },
		);
		act(() => {
			result.current.containerRef(container);
		});
		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});
		const firstPlayer = youtube.players[0];
		act(() => firstPlayer.triggerReady());
		act(() => firstPlayer.triggerStateChange(YouTubePlayerState.PLAYING));

		// Act
		rerender({ videoId: "vod-beta" });
		const resetState = result.current.status;
		act(() => firstPlayer.triggerStateChange(YouTubePlayerState.PAUSED));
		result.current.play();
		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});
		const secondPlayer = youtube.players[1];
		act(() => secondPlayer.triggerReady());
		act(() => secondPlayer.triggerStateChange(YouTubePlayerState.PLAYING));
		result.current.play();

		// Assert
		expect(resetState).toBe(PlaybackStatus.UNSTARTED);
		expect(firstPlayer.playVideo).not.toHaveBeenCalled();
		expect(secondPlayer.playVideo).toHaveBeenCalledTimes(1);
		expect(result.current.status).toBe(PlaybackStatus.PLAYING);
		expect(onStatusChange).toHaveBeenCalledTimes(2);
		expect(onStatusChange).toHaveBeenNthCalledWith(1, PlaybackStatus.PLAYING);
		expect(onStatusChange).toHaveBeenNthCalledWith(2, PlaybackStatus.PLAYING);
	});

	it("starts requestAnimationFrame sampling on PLAYING state and publishes currentTime and onTimeUpdate", async () => {
		// Arrange
		const frames = installMockFrames();
		const { useVodPlayer } = await import("../use-vod-player");
		const youtube = createYouTubeMock(142);
		setYouTubeNamespace(youtube.namespace);
		const onTimeUpdate = vi.fn();
		const container = document.createElement("div");
		const { result } = renderHook(() =>
			useVodPlayer({
				onTimeUpdate,
				videoId: "time-sync-video",
			}),
		);
		act(() => {
			result.current.containerRef(container);
		});
		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});
		const player = youtube.players[0];
		act(() => player.triggerReady());

		// Act
		vi.mocked(player.getCurrentTime).mockReturnValue(1.25);
		act(() => player.triggerStateChange(YouTubePlayerState.PLAYING));
		const initialSampleTime = result.current.currentTime;
		vi.mocked(player.getCurrentTime).mockReturnValue(2.5);
		act(() => frames.flush());
		const secondSampleTime = result.current.currentTime;

		// Assert
		expect(frames.requestAnimationFrame).toHaveBeenCalled();
		expect(initialSampleTime).toBe(1.25);
		expect(secondSampleTime).toBe(2.5);
		expect(onTimeUpdate).toHaveBeenCalledTimes(2);
		expect(onTimeUpdate).toHaveBeenNthCalledWith(1, 1.25);
		expect(onTimeUpdate).toHaveBeenNthCalledWith(2, 2.5);
	});

	it("stops requestAnimationFrame polling on non-playing states and preserves the last paused time", async () => {
		// Arrange
		const frames = installMockFrames();
		const { useVodPlayer } = await import("../use-vod-player");
		const youtube = createYouTubeMock(142);
		setYouTubeNamespace(youtube.namespace);
		const onTimeUpdate = vi.fn();
		const container = document.createElement("div");
		const { result } = renderHook(() =>
			useVodPlayer({
				onTimeUpdate,
				videoId: "pause-preserve-video",
			}),
		);
		act(() => {
			result.current.containerRef(container);
		});
		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});
		const player = youtube.players[0];
		act(() => player.triggerReady());
		vi.mocked(player.getCurrentTime).mockReturnValue(12.34);
		act(() => player.triggerStateChange(YouTubePlayerState.PLAYING));

		// Act
		vi.mocked(player.getCurrentTime).mockClear();
		act(() => player.triggerStateChange(YouTubePlayerState.PAUSED));
		const pausedTime = result.current.currentTime;
		act(() => frames.flush());

		// Assert
		expect(frames.cancelAnimationFrame).toHaveBeenCalled();
		expect(pausedTime).toBe(12.34);
		expect(result.current.currentTime).toBe(12.34);
		expect(player.getCurrentTime).not.toHaveBeenCalled();
	});

	it("stops requestAnimationFrame polling when player enters ENDED state", async () => {
		// Arrange
		const frames = installMockFrames();
		const { useVodPlayer } = await import("../use-vod-player");
		const youtube = createYouTubeMock(142);
		setYouTubeNamespace(youtube.namespace);
		const onTimeUpdate = vi.fn();
		const container = document.createElement("div");
		const { result } = renderHook(() =>
			useVodPlayer({
				onTimeUpdate,
				videoId: "ended-video",
			}),
		);
		act(() => {
			result.current.containerRef(container);
		});
		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});
		const player = youtube.players[0];
		act(() => player.triggerReady());
		vi.mocked(player.getCurrentTime).mockReturnValue(142);
		act(() => player.triggerStateChange(YouTubePlayerState.PLAYING));

		// Act
		vi.mocked(player.getCurrentTime).mockClear();
		act(() => player.triggerStateChange(YouTubePlayerState.ENDED));
		const endedTime = result.current.currentTime;
		act(() => frames.flush());

		// Assert
		expect(frames.cancelAnimationFrame).toHaveBeenCalled();
		expect(endedTime).toBe(142);
		expect(result.current.currentTime).toBe(142);
		expect(player.getCurrentTime).not.toHaveBeenCalled();
	});

	it("pauses player on document visibility hidden without resuming when returning to visible", async () => {
		// Arrange
		installMockFrames();
		const { useVodPlayer } = await import("../use-vod-player");
		const youtube = createYouTubeMock(142);
		setYouTubeNamespace(youtube.namespace);
		const container = document.createElement("div");
		const { result } = renderHook(() =>
			useVodPlayer({
				videoId: "visibility-video",
			}),
		);
		act(() => {
			result.current.containerRef(container);
		});
		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});
		const player = youtube.players[0];
		act(() => player.triggerReady());
		act(() => player.triggerStateChange(YouTubePlayerState.PLAYING));

		// Act
		act(() => setDocumentVisibility("hidden"));
		const pauseCallsAfterHidden = vi.mocked(player.pauseVideo).mock.calls
			.length;
		act(() => setDocumentVisibility("visible"));
		const playCallsAfterVisible = vi.mocked(player.playVideo).mock.calls.length;

		// Assert
		expect(pauseCallsAfterHidden).toBe(1);
		expect(playCallsAfterVisible).toBe(0);
	});

	it("cancels pending animation frames and removes visibility listener on unmount", async () => {
		// Arrange
		const frames = installMockFrames();
		const { useVodPlayer } = await import("../use-vod-player");
		const youtube = createYouTubeMock(142);
		setYouTubeNamespace(youtube.namespace);
		const container = document.createElement("div");
		const { result, unmount } = renderHook(() =>
			useVodPlayer({
				videoId: "cleanup-video",
			}),
		);
		act(() => {
			result.current.containerRef(container);
		});
		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});
		const player = youtube.players[0];
		act(() => player.triggerReady());
		act(() => player.triggerStateChange(YouTubePlayerState.PLAYING));

		// Act
		unmount();
		act(() => setDocumentVisibility("hidden"));
		act(() => frames.flush());

		// Assert
		expect(frames.cancelAnimationFrame).toHaveBeenCalled();
		expect(player.destroy).toHaveBeenCalledTimes(1);
		expect(player.pauseVideo).not.toHaveBeenCalled();
	});

	it("normalizes non-finite or negative currentTime samples during active playback frames", async () => {
		// Arrange
		const frames = installMockFrames();
		const { useVodPlayer } = await import("../use-vod-player");
		const youtube = createYouTubeMock(142);
		setYouTubeNamespace(youtube.namespace);
		const onTimeUpdate = vi.fn();
		const container = document.createElement("div");
		const { result } = renderHook(() =>
			useVodPlayer({
				onTimeUpdate,
				videoId: "unsafe-frame-video",
			}),
		);
		act(() => {
			result.current.containerRef(container);
		});
		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});
		const player = youtube.players[0];
		act(() => player.triggerReady());

		// Act
		vi.mocked(player.getCurrentTime).mockReturnValue(Number.NaN);
		act(() => player.triggerStateChange(YouTubePlayerState.PLAYING));
		const nanTime = result.current.currentTime;
		vi.mocked(player.getCurrentTime).mockReturnValue(-5);
		act(() => frames.flush());
		const negativeTime = result.current.currentTime;

		// Assert
		expect(nanTime).toBe(0);
		expect(negativeTime).toBe(0);
		expect(onTimeUpdate).toHaveBeenNthCalledWith(1, 0);
		expect(onTimeUpdate).toHaveBeenNthCalledWith(2, 0);
	});

	it("ignores scheduled animation frames after generation becomes inactive", async () => {
		// Arrange
		let lingeringCallback: FrameRequestCallback | undefined;
		vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
			lingeringCallback = cb;
			return 999;
		});
		vi.spyOn(window, "cancelAnimationFrame").mockImplementation(
			() => undefined,
		);
		const { useVodPlayer } = await import("../use-vod-player");
		const youtube = createYouTubeMock(142);
		setYouTubeNamespace(youtube.namespace);
		const onTimeUpdate = vi.fn();
		const container = document.createElement("div");
		const { result, rerender } = renderHook(
			({ videoId }: { videoId: string }) =>
				useVodPlayer({ onTimeUpdate, videoId }),
			{ initialProps: { videoId: "gen-1" } },
		);
		act(() => {
			result.current.containerRef(container);
		});
		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});
		const player = youtube.players[0];
		act(() => player.triggerReady());
		act(() => player.triggerStateChange(YouTubePlayerState.PLAYING));

		// Act
		rerender({ videoId: "gen-2" });
		vi.mocked(player.getCurrentTime).mockClear();
		act(() => {
			lingeringCallback?.(1000);
		});

		// Assert
		expect(player.getCurrentTime).not.toHaveBeenCalled();
	});

	it("safely ignores visibility changes before a player instance is created", async () => {
		// Arrange
		const { useVodPlayer } = await import("../use-vod-player");
		const youtube = createYouTubeMock(142);
		setYouTubeNamespace(youtube.namespace);

		// Act
		renderHook(() => useVodPlayer({ videoId: "no-player-visibility" }));
		act(() => setDocumentVisibility("hidden"));

		// Assert
		expect(youtube.players).toHaveLength(0);
	});

	it("pauses player when document.hidden is true", async () => {
		// Arrange
		installMockFrames();
		const { useVodPlayer } = await import("../use-vod-player");
		const youtube = createYouTubeMock(142);
		setYouTubeNamespace(youtube.namespace);
		const container = document.createElement("div");
		const { result } = renderHook(() =>
			useVodPlayer({
				videoId: "doc-hidden-video",
			}),
		);
		act(() => {
			result.current.containerRef(container);
		});
		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});
		const player = youtube.players[0];
		act(() => player.triggerReady());
		act(() => player.triggerStateChange(YouTubePlayerState.PLAYING));

		// Act
		Object.defineProperty(document, "visibilityState", {
			configurable: true,
			value: "visible",
		});
		Object.defineProperty(document, "hidden", {
			configurable: true,
			value: true,
		});
		act(() => {
			document.dispatchEvent(new Event("visibilitychange"));
		});

		// Assert
		expect(player.pauseVideo).toHaveBeenCalledTimes(1);
	});
});
