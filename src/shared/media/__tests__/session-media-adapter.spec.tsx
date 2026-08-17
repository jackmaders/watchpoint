import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	createYouTubeMock,
	installMockFrames,
	setDocumentVisibility,
	setYouTubeNamespace,
} from "../__mocks__/youtube";
import {
	executeSessionMediaCommand,
	useSessionMediaAdapter,
} from "../session-media-adapter";
import type { VodPlayerResult } from "../types";
import { PlaybackStatus } from "../types";
import { YouTubePlayerState } from "../youtube-adapter";

describe("session media adapter", () => {
	afterEach(() => {
		vi.restoreAllMocks();
		setYouTubeNamespace(undefined);
		document.head.replaceChildren();
		delete window.onYouTubeIframeAPIReady;
	});

	it("translates semantic commands into media controls", () => {
		// Arrange
		const controls: Pick<VodPlayerResult, "pause" | "play" | "seekTo"> = {
			pause: vi.fn(),
			play: vi.fn(),
			seekTo: vi.fn(),
		};

		// Act
		executeSessionMediaCommand({ type: "PAUSE" }, controls);
		executeSessionMediaCommand({ type: "PLAY" }, controls);
		executeSessionMediaCommand(
			{ timestampSeconds: 5, type: "REPLAY_CONTEXT" },
			controls,
		);
		executeSessionMediaCommand(
			{ timestampSeconds: 40, type: "REPLAY_CONTEXT" },
			controls,
		);
		executeSessionMediaCommand({ autoplay: false, type: "RESTART" }, controls);
		executeSessionMediaCommand({ autoplay: true, type: "RESTART" }, controls);

		// Assert
		expect(controls.pause).toHaveBeenCalledTimes(1);
		expect(controls.play).toHaveBeenCalledTimes(4);
		expect(controls.seekTo).toHaveBeenNthCalledWith(1, 0, true);
		expect(controls.seekTo).toHaveBeenNthCalledWith(2, 30, true);
		expect(controls.seekTo).toHaveBeenNthCalledWith(3, 0, true);
		expect(controls.seekTo).toHaveBeenNthCalledWith(4, 0, true);
		expect(controls.seekTo).toHaveBeenCalledTimes(4);
	});

	it("delivers normalized readiness, status, and time events", async () => {
		// Arrange
		const frameController = installMockFrames();
		const youtube = createYouTubeMock(142);
		setYouTubeNamespace(youtube.namespace);
		const onEvent = vi.fn();
		const container = document.createElement("div");
		const { result } = renderHook(() =>
			useSessionMediaAdapter({ onEvent, videoId: "semantic-video" }),
		);

		// Act
		act(() => result.current.containerRef(container));
		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});
		const player = youtube.players[0];
		player.getCurrentTime = vi.fn(() => 18.5);
		act(() => {
			player.triggerReady();
			player.triggerStateChange(YouTubePlayerState.PLAYING);
			frameController.flush();
		});

		// Assert
		expect(onEvent).toHaveBeenNthCalledWith(1, {
			duration: 142,
			type: "READY",
		});
		expect(onEvent).toHaveBeenNthCalledWith(2, {
			time: 18.5,
			type: "TIME_UPDATED",
		});
		expect(onEvent).toHaveBeenNthCalledWith(3, {
			status: PlaybackStatus.PLAYING,
			type: "PLAYBACK_STATUS_CHANGED",
		});
		expect(result.current.currentTime).toBe(18.5);
	});

	it("ignores stale lifecycle events after the VOD changes", async () => {
		// Arrange
		const youtube = createYouTubeMock();
		setYouTubeNamespace(youtube.namespace);
		const onEvent = vi.fn();
		const container = document.createElement("div");
		const { result, rerender } = renderHook(
			({ videoId }: { videoId: string }) =>
				useSessionMediaAdapter({ onEvent, videoId }),
			{ initialProps: { videoId: "first-video" } },
		);

		act(() => result.current.containerRef(container));
		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});
		const firstPlayer = youtube.players[0];

		// Act
		rerender({ videoId: "second-video" });
		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});
		const secondPlayer = youtube.players[1];
		act(() => {
			firstPlayer.triggerReady();
			secondPlayer.triggerReady();
		});

		// Assert
		expect(firstPlayer.destroy).toHaveBeenCalledTimes(1);
		expect(onEvent).toHaveBeenCalledTimes(1);
		expect(onEvent).toHaveBeenCalledWith({
			duration: 142,
			type: "READY",
		});
	});

	it("pauses on hidden visibility and removes the listener on cleanup", async () => {
		// Arrange
		const youtube = createYouTubeMock();
		setYouTubeNamespace(youtube.namespace);
		const container = document.createElement("div");
		const { result, unmount } = renderHook(() =>
			useSessionMediaAdapter({ videoId: "visibility-video" }),
		);

		act(() => result.current.containerRef(container));
		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});
		const player = youtube.players[0];

		// Act
		setDocumentVisibility("hidden");
		unmount();
		setDocumentVisibility("hidden");

		// Assert
		expect(player.pauseVideo).toHaveBeenCalledTimes(1);
	});
});
