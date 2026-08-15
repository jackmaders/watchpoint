import { vi } from "vitest";
import type {
	YouTubeNamespace,
	YouTubePlayer,
	YouTubePlayerOptions,
	YouTubePlayerState,
} from "../youtube";

export function setYouTubeNamespace(namespace: YouTubeNamespace | undefined) {
	Object.defineProperty(window, "YT", {
		configurable: true,
		value: namespace,
	});
}

export interface MockYouTubePlayer extends YouTubePlayer {
	options: YouTubePlayerOptions;
	triggerReady(): void;
	triggerStateChange(state: YouTubePlayerState): void;
}

export interface YouTubeMock {
	namespace: YouTubeNamespace;
	players: MockYouTubePlayer[];
}

export function createYouTubeMock(
	duration = 142,
	onCreate?: () => void,
): YouTubeMock {
	const players: MockYouTubePlayer[] = [];
	function PlayerConstructor(
		_element: HTMLElement,
		options: YouTubePlayerOptions,
	): MockYouTubePlayer {
		onCreate?.();
		const player = {
			destroy: vi.fn(),
			getCurrentTime: vi.fn(() => 0),
			getDuration: vi.fn(() => duration),
			options,
			pauseVideo: vi.fn(),
			playVideo: vi.fn(),
			seekTo: vi.fn(),
			triggerReady: () => {
				options.events?.onReady?.({ target: player });
			},
			triggerStateChange: (state: YouTubePlayerState) => {
				options.events?.onStateChange?.({ data: state, target: player });
			},
		} as MockYouTubePlayer;

		players.push(player);
		return player;
	}

	const Player = vi.fn(PlayerConstructor);

	return {
		namespace: { Player: Player as unknown as YouTubeNamespace["Player"] },
		players,
	};
}
