export const PlaybackStatus = {
	BUFFERING: "buffering",
	CUED: "cued",
	ENDED: "ended",
	PAUSED: "paused",
	PLAYING: "playing",
	UNSTARTED: "unstarted",
} as const;

export type PlaybackStatus =
	(typeof PlaybackStatus)[keyof typeof PlaybackStatus];

export type VodContainerRef = (node: HTMLDivElement | null) => void;

export interface VodPlayerOptions {
	autoplay?: boolean;
	onReady?: (duration: number) => void;
	onStatusChange?: (status: PlaybackStatus) => void;
	onTimeUpdate?: (currentTime: number) => void;
	videoId: string;
}

export interface VodPlayerResult {
	containerRef: VodContainerRef;
	currentTime: number;
	duration: number;
	isReady: boolean;
	pause: () => void;
	play: () => void;
	replay: () => void;
	seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
	status: PlaybackStatus;
}
