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

export const MediaFailureCategory = {
	API_LOAD: "api-load",
	BUFFERING: "buffering",
	PLAYBACK: "playback",
	PLAYER_CONSTRUCTION: "player-construction",
	PROVIDER: "provider",
	READINESS: "readiness",
} as const;

export type MediaFailureCategory =
	(typeof MediaFailureCategory)[keyof typeof MediaFailureCategory];

export type MediaFailureOutcome = "recovered" | "terminal";

export interface MediaFailure {
	category: MediaFailureCategory;
	code?: string;
	message: string;
}

export interface MediaDiagnostic {
	eventType: "failure" | "recovery";
	failureCategory: MediaFailureCategory;
	videoId: string;
	generation: number;
	currentTime: number;
	retryCount: number;
	eventTimestamp: number;
	outcome: MediaFailureOutcome;
	providerCode?: string;
}

export type VodContainerRef = (node: HTMLDivElement | null) => void;

export interface VodPlayerOptions {
	autoplay?: boolean;
	lifecycleKey?: number;
	onError?: (failure: MediaFailure, lifecycleKey?: number) => void;
	onReady?: (duration: number, lifecycleKey?: number) => void;
	onStatusChange?: (status: PlaybackStatus, lifecycleKey?: number) => void;
	onTimeUpdate?: (currentTime: number, lifecycleKey?: number) => void;
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
