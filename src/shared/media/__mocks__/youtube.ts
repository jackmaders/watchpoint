import { vi } from "vitest";
import type {
	YouTubeNamespace,
	YouTubePlayer,
	YouTubePlayerOptions,
} from "../youtube";

export interface MockYouTubePlayer extends YouTubePlayer {
	options: YouTubePlayerOptions;
	triggerReady(): void;
}

export interface YouTubeMock {
	namespace: YouTubeNamespace;
	players: MockYouTubePlayer[];
}

export function createYouTubeMock(duration = 142): YouTubeMock {
	const players: MockYouTubePlayer[] = [];
	function PlayerConstructor(
		_element: HTMLElement,
		options: YouTubePlayerOptions,
	): MockYouTubePlayer {
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
