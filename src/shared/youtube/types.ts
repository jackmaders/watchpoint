export interface YouTubeCue {
	readonly id: string;
	readonly timestampSeconds: number;
}

export interface YouTubePlayerAdapter {
	getCurrentTime(): number;
	getPlaybackRate(): number;
	getPlayerState(): number;
	getVolume(): number;
	isMuted(): boolean;
	mute(): void;
	pauseVideo(): void;
	playVideo(): void;
	seekTo(seconds: number, allowSeekAhead?: boolean): void;
	setPlaybackRate(rate: number): void;
	setVolume(volume: number): void;
	unMute(): void;
}

export interface YouTubePlayerSettings {
	readonly isMuted: boolean;
	readonly playbackRate: number;
	readonly volume: number;
}

export interface YouTubeSyncEngineOptions {
	readonly cues?: readonly YouTubeCue[];
	readonly leadTimeMs?: number;
	readonly onCueTrigger?: (cue: YouTubeCue) => void;
	readonly onStateChange?: (state: number) => void;
	readonly onTimeUpdate?: (currentTime: number) => void;
	readonly player: YouTubePlayerAdapter;
}
