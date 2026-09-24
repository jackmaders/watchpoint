import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { loadYouTubeIframeApi } from "../load-api";
import { useYouTubePlayer } from "../use-youtube-player";

vi.mock("../load-api", () => {
	return {
		loadYouTubeIframeApi: vi.fn(),
	};
});

describe("useYouTubePlayer", () => {
	let mockPlayerInstance: {
		getCurrentTime: ReturnType<typeof vi.fn>;
		getPlayerState: ReturnType<typeof vi.fn>;
		getPlaybackRate: ReturnType<typeof vi.fn>;
		getVolume: ReturnType<typeof vi.fn>;
		isMuted: ReturnType<typeof vi.fn>;
		playVideo: ReturnType<typeof vi.fn>;
		pauseVideo: ReturnType<typeof vi.fn>;
		seekTo: ReturnType<typeof vi.fn>;
		setPlaybackRate: ReturnType<typeof vi.fn>;
		setVolume: ReturnType<typeof vi.fn>;
		mute: ReturnType<typeof vi.fn>;
		unMute: ReturnType<typeof vi.fn>;
		destroy: ReturnType<typeof vi.fn>;
	};
	let capturedEvents: Record<string, ((event?: unknown) => void) | undefined>;

	beforeEach(() => {
		capturedEvents = {};
		mockPlayerInstance = {
			getCurrentTime: vi.fn(() => 0),
			getPlayerState: vi.fn(() => -1),
			getPlaybackRate: vi.fn(() => 1),
			getVolume: vi.fn(() => 100),
			isMuted: vi.fn(() => false),
			playVideo: vi.fn(),
			pauseVideo: vi.fn(),
			seekTo: vi.fn(),
			setPlaybackRate: vi.fn(),
			setVolume: vi.fn(),
			mute: vi.fn(),
			unMute: vi.fn(),
			destroy: vi.fn(),
		};

		function MockPlayer(
			this: unknown,
			_elementOrId: unknown,
			config: { events?: Record<string, (event?: unknown) => void> },
		) {
			capturedEvents = config.events ?? {};
			return mockPlayerInstance;
		}

		const mockYT = {
			Player: vi.fn().mockImplementation(MockPlayer),
			PlayerState: {
				UNSTARTED: -1,
				ENDED: 0,
				PLAYING: 1,
				PAUSED: 2,
				BUFFERING: 3,
				CUED: 5,
			},
		};

		vi.mocked(loadYouTubeIframeApi).mockResolvedValue(
			mockYT as unknown as typeof YT,
		);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	test("initializes player when container element is provided and updates isReady on onReady event", async () => {
		const container = document.createElement("div");
		const onReadyMock = vi.fn();

		const { result } = renderHook(() =>
			useYouTubePlayer({
				containerElement: container,
				videoId: "test-video-id",
				onReady: onReadyMock,
			}),
		);

		expect(result.current.isReady).toBe(false);

		// Await api loading tick
		await act(async () => {
			await Promise.resolve();
		});

		// Trigger onReady event
		act(() => {
			capturedEvents.onReady?.({ target: mockPlayerInstance });
		});

		expect(result.current.isReady).toBe(true);
		expect(onReadyMock).toHaveBeenCalledTimes(1);
	});

	test("provides player control methods that delegate to the player instance", async () => {
		const container = document.createElement("div");

		const { result } = renderHook(() =>
			useYouTubePlayer({
				containerElement: container,
				videoId: "test-video-id",
			}),
		);

		await act(async () => {
			await Promise.resolve();
		});

		act(() => {
			capturedEvents.onReady?.({ target: mockPlayerInstance });
		});

		act(() => {
			result.current.play();
			result.current.pause();
			result.current.seekTo(45);
			result.current.setPlaybackRate(1.5);
			result.current.setVolume(80);
			result.current.mute();
			result.current.unMute();
		});

		expect(mockPlayerInstance.playVideo).toHaveBeenCalledTimes(1);
		expect(mockPlayerInstance.pauseVideo).toHaveBeenCalledTimes(1);
		expect(mockPlayerInstance.seekTo).toHaveBeenCalledWith(45, true);
		expect(mockPlayerInstance.setPlaybackRate).toHaveBeenCalledWith(1.5);
		expect(mockPlayerInstance.setVolume).toHaveBeenCalledWith(80);
		expect(mockPlayerInstance.mute).toHaveBeenCalledTimes(1);
		expect(mockPlayerInstance.unMute).toHaveBeenCalledTimes(1);
	});

	test("destroys player instance and stops sync engine on unmount", async () => {
		const container = document.createElement("div");

		const { unmount } = renderHook(() =>
			useYouTubePlayer({
				containerElement: container,
				videoId: "test-video-id",
			}),
		);

		await act(async () => {
			await Promise.resolve();
		});

		act(() => {
			capturedEvents.onReady?.({ target: mockPlayerInstance });
		});

		unmount();

		expect(mockPlayerInstance.destroy).toHaveBeenCalledTimes(1);
	});
});
