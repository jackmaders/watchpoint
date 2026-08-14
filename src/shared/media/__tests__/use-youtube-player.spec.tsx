import { act, renderHook } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createYouTubeMock } from "../__mocks__/youtube";
import { useYouTubePlayer } from "../use-youtube-player";
import type { YouTubeNamespace } from "../youtube";

function setYouTubeNamespace(namespace: YouTubeNamespace | undefined) {
	Object.defineProperty(window, "YT", {
		configurable: true,
		value: namespace,
	});
}

function createContainerWrapper(
	containerRef: { current: HTMLDivElement | null },
	strictMode = false,
) {
	return function ContainerWrapper({ children }: PropsWithChildren) {
		const container = <div ref={containerRef}>{children}</div>;
		return strictMode ? <StrictMode>{container}</StrictMode> : container;
	};
}

describe("useYouTubePlayer", () => {
	afterEach(() => {
		vi.restoreAllMocks();
		setYouTubeNamespace(undefined);
	});

	it("creates a configured player and reports readiness with its duration", async () => {
		// Arrange
		const youtube = createYouTubeMock(142);
		setYouTubeNamespace(youtube.namespace);
		const onReady = vi.fn();
		const containerRef: { current: HTMLDivElement | null } = { current: null };
		const wrapper = createContainerWrapper(containerRef);

		// Act
		const { result } = renderHook(
			() =>
				useYouTubePlayer({
					autoplay: true,
					containerRef,
					onReady,
					videoId: "dQw4w9WgXcQ",
				}),
			{ wrapper },
		);
		const initialState = { ...result.current };
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
		const youtube = createYouTubeMock();
		setYouTubeNamespace(youtube.namespace);
		const containerRef: { current: HTMLDivElement | null } = { current: null };
		const wrapper = createContainerWrapper(containerRef);

		// Act
		const { result } = renderHook(
			() => useYouTubePlayer({ containerRef, videoId: "dQw4w9WgXcQ" }),
			{ wrapper },
		);
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

	it("destroys a player whose container became stale during construction", async () => {
		// Arrange
		const containerRef: { current: HTMLDivElement | null } = { current: null };
		const onReady = vi.fn();
		const youtube = createYouTubeMock(142, () => {
			containerRef.current = document.createElement("div");
		});
		setYouTubeNamespace(youtube.namespace);
		const wrapper = createContainerWrapper(containerRef);

		// Act
		const { result, unmount } = renderHook(
			() =>
				useYouTubePlayer({
					containerRef,
					onReady,
					videoId: "stale-container",
				}),
			{ wrapper },
		);
		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});
		const player = youtube.players[0];
		act(() => player.triggerReady());
		unmount();

		// Assert
		expect(player.destroy).toHaveBeenCalledTimes(1);
		expect(result.current.isReady).toBe(false);
		expect(result.current.duration).toBe(0);
		expect(onReady).not.toHaveBeenCalled();
	});

	it("destroys the old player and ignores its late ready callback when the VOD changes", async () => {
		// Arrange
		const youtube = createYouTubeMock();
		setYouTubeNamespace(youtube.namespace);
		const onReady = vi.fn();
		const containerRef: { current: HTMLDivElement | null } = { current: null };
		const wrapper = createContainerWrapper(containerRef);
		const { result, rerender } = renderHook(
			({ videoId }: { videoId: string }) =>
				useYouTubePlayer({ containerRef, onReady, videoId }),
			{ initialProps: { videoId: "first-video" }, wrapper },
		);
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

	it("cleans up its owned player through a StrictMode mount cycle", async () => {
		// Arrange
		const youtube = createYouTubeMock();
		setYouTubeNamespace(youtube.namespace);
		const onReady = vi.fn();
		const containerRef: { current: HTMLDivElement | null } = { current: null };
		const wrapper = createContainerWrapper(containerRef, true);

		// Act
		const { unmount } = renderHook(
			() =>
				useYouTubePlayer({ containerRef, onReady, videoId: "strict-video" }),
			{ wrapper },
		);
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
});
