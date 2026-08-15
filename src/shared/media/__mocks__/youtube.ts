import { vi } from "vitest";
import type {
	YouTubeNamespace,
	YouTubePlayer,
	YouTubePlayerOptions,
	YouTubePlayerState,
} from "../youtube-adapter";

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

export class MockFrameController {
	private nextId = 1;
	private callbacks = new Map<number, FrameRequestCallback>();

	readonly requestAnimationFrame = vi.fn(
		(callback: FrameRequestCallback): number => {
			const id = this.nextId++;
			this.callbacks.set(id, callback);
			return id;
		},
	);

	readonly cancelAnimationFrame = vi.fn((id: number): void => {
		this.callbacks.delete(id);
	});

	get pendingCount(): number {
		return this.callbacks.size;
	}

	flush(time = 1000): void {
		const pending = Array.from(this.callbacks.entries());
		this.callbacks.clear();
		for (const [, callback] of pending) {
			callback(time);
		}
	}
}

export function installMockFrames(): MockFrameController {
	const controller = new MockFrameController();
	vi.spyOn(window, "requestAnimationFrame").mockImplementation(
		controller.requestAnimationFrame,
	);
	vi.spyOn(window, "cancelAnimationFrame").mockImplementation(
		controller.cancelAnimationFrame,
	);
	return controller;
}

export function setDocumentVisibility(state: DocumentVisibilityState): void {
	Object.defineProperty(document, "visibilityState", {
		configurable: true,
		value: state,
	});
	Object.defineProperty(document, "hidden", {
		configurable: true,
		value: state === "hidden",
	});
	document.dispatchEvent(new Event("visibilitychange"));
}
