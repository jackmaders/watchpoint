export interface VideoMarker {
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
