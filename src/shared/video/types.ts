/**
 * @fileOverview Defines the contracts used by the shared video cue integration.
 *
 * Keeps cue data and synchronization options independent from any player vendor.
 */

export interface VideoCue {
	readonly id: string;
	readonly timestampSeconds: number;
}

export interface VideoPlayer {
	currentTime: number;
	pause(): void;
}

export interface VideoMedia extends VideoPlayer {
	addEventListener(type: string, listener: EventListener): void;
	readonly paused: boolean;
	removeEventListener(type: string, listener: EventListener): void;
}

export interface VideoSyncEngineOptions {
	readonly cues?: readonly VideoCue[];
	readonly leadTimeMs?: number;
	readonly onCueTrigger?: (cue: VideoCue) => void;
	readonly onTimeUpdate?: (currentTime: number) => void;
	readonly player: VideoPlayer;
}
