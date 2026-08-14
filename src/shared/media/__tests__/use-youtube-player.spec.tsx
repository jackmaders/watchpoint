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
});
