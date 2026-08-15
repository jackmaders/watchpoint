import { act, render, renderHook } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createYouTubeMock, setYouTubeNamespace } from "../__mocks__/youtube";

describe("useYouTubePlayer", () => {
	beforeEach(() => {
		vi.resetModules();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		setYouTubeNamespace(undefined);
		document.head.replaceChildren();
		delete window.onYouTubeIframeAPIReady;
	});

	it("initializes as unready and transitions to ready when the container mounts and player fires onReady", async () => {
		// Arrange
		const { useYouTubePlayer } = await import("../use-youtube-player");
		const youtube = createYouTubeMock(142);
		setYouTubeNamespace(youtube.namespace);
		const onReady = vi.fn();
		const container = document.createElement("div");

		// Act
		const { result } = renderHook(() =>
			useYouTubePlayer({
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
		const { useYouTubePlayer } = await import("../use-youtube-player");
		const youtube = createYouTubeMock();
		setYouTubeNamespace(youtube.namespace);

		// Act
		const { result } = renderHook(() =>
			useYouTubePlayer({ videoId: "dQw4w9WgXcQ" }),
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
		const { useYouTubePlayer } = await import("../use-youtube-player");
		const youtube = createYouTubeMock();
		setYouTubeNamespace(youtube.namespace);
		const container = document.createElement("div");

		// Act
		const { result } = renderHook(() =>
			useYouTubePlayer({ videoId: "dQw4w9WgXcQ" }),
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
		const { useYouTubePlayer } = await import("../use-youtube-player");
		const youtube = createYouTubeMock();
		setYouTubeNamespace(youtube.namespace);
		const onReady = vi.fn();
		const container = document.createElement("div");
		const { result, rerender } = renderHook(
			({ videoId }: { videoId: string }) =>
				useYouTubePlayer({ onReady, videoId }),
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
		const { useYouTubePlayer } = await import("../use-youtube-player");
		const youtube = createYouTubeMock();
		setYouTubeNamespace(youtube.namespace);
		const onReady = vi.fn();
		const container = document.createElement("div");

		// Act
		const { result, unmount } = renderHook(() =>
			useYouTubePlayer({ onReady, videoId: "strict-video" }),
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
		const { useYouTubePlayer } = await import("../use-youtube-player");
		const youtube = createYouTubeMock(142);
		setYouTubeNamespace(youtube.namespace);
		let latestState: ReturnType<typeof useYouTubePlayer> | undefined;
		function ConditionalPlayer({ show }: { show: boolean }) {
			const state = useYouTubePlayer({ videoId: "late-container" });
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
		const { useYouTubePlayer } = await import("../use-youtube-player");
		const youtube = createYouTubeMock();
		setYouTubeNamespace(youtube.namespace);
		function StrictPlayer() {
			const state = useYouTubePlayer({ videoId: "strict-tree" });
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
		const { useYouTubePlayer } = await import("../use-youtube-player");
		const youtube = createYouTubeMock();
		setYouTubeNamespace(youtube.namespace);
		const container = document.createElement("div");

		// Act
		const { result } = renderHook(() =>
			useYouTubePlayer({ videoId: "pre-ready-video" }),
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

	it("delegates play, pause, and seekTo with expected arguments once ready", async () => {
		// Arrange
		const { useYouTubePlayer } = await import("../use-youtube-player");
		const youtube = createYouTubeMock(142);
		setYouTubeNamespace(youtube.namespace);
		const container = document.createElement("div");
		const { result } = renderHook(() =>
			useYouTubePlayer({ videoId: "ready-video" }),
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

		// Assert
		expect(player.playVideo).toHaveBeenCalledTimes(1);
		expect(player.pauseVideo).toHaveBeenCalledTimes(1);
		expect(player.seekTo).toHaveBeenNthCalledWith(1, 15, true);
		expect(player.seekTo).toHaveBeenNthCalledWith(2, 30, false);
	});

	it("executes replay as seek-to-zero followed by play in exact sequence", async () => {
		// Arrange
		const { useYouTubePlayer } = await import("../use-youtube-player");
		const youtube = createYouTubeMock(142);
		setYouTubeNamespace(youtube.namespace);
		const container = document.createElement("div");
		const { result } = renderHook(() =>
			useYouTubePlayer({ videoId: "replay-video" }),
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

	it("tracks playerState transitions and forwards onStateChange callbacks", async () => {
		// Arrange
		const { useYouTubePlayer } = await import("../use-youtube-player");
		const { YouTubePlayerState } = await import("../youtube");
		const youtube = createYouTubeMock(142);
		setYouTubeNamespace(youtube.namespace);
		const onStateChange = vi.fn();
		const container = document.createElement("div");

		// Act
		const { result } = renderHook(() =>
			useYouTubePlayer({
				onStateChange,
				videoId: "state-video",
			}),
		);
		const initialState = result.current.playerState;
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
		const playingState = result.current.playerState;
		act(() => player.triggerStateChange(YouTubePlayerState.PAUSED));
		const pausedState = result.current.playerState;

		// Assert
		expect(initialState).toBeNull();
		expect(playingState).toBe(1);
		expect(pausedState).toBe(2);
		expect(onStateChange).toHaveBeenCalledTimes(2);
		expect(onStateChange).toHaveBeenNthCalledWith(1, 1);
		expect(onStateChange).toHaveBeenNthCalledWith(2, 2);
	});

	it("resets playerState on VOD change and routes commands and events to the active player only", async () => {
		// Arrange
		const { useYouTubePlayer } = await import("../use-youtube-player");
		const { YouTubePlayerState } = await import("../youtube");
		const youtube = createYouTubeMock(142);
		setYouTubeNamespace(youtube.namespace);
		const onStateChange = vi.fn();
		const container = document.createElement("div");
		const { result, rerender } = renderHook(
			({ videoId }: { videoId: string }) =>
				useYouTubePlayer({ onStateChange, videoId }),
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
		const resetState = result.current.playerState;
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
		expect(resetState).toBeNull();
		expect(firstPlayer.playVideo).not.toHaveBeenCalled();
		expect(secondPlayer.playVideo).toHaveBeenCalledTimes(1);
		expect(result.current.playerState).toBe(1);
		expect(onStateChange).toHaveBeenCalledTimes(2);
		expect(onStateChange).toHaveBeenNthCalledWith(1, 1);
		expect(onStateChange).toHaveBeenNthCalledWith(2, 1);
	});
});
