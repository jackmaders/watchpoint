import type { VideoMarker, VideoPlayer } from "./types";

const DEFAULT_LEAD_TIME_MS = 80;
const MAX_OVERSHOOT_MS = 500;

export interface VideoMarkerSchedulerOptions {
	readonly getMarkers?: () => readonly VideoMarker[];
	readonly leadTimeMs?: number;
	readonly onMarkerTrigger?: (marker: VideoMarker) => void;
	readonly onTimeUpdate?: (currentTime: number) => void;
	readonly overshootTimeMs?: number;
	readonly player: VideoPlayer;
}

/** Schedules timestamped video markers against native media playback. */
export class VideoMarkerScheduler {
	private readonly getMarkers: () => readonly VideoMarker[];
	private readonly player: VideoPlayer;
	private readonly onMarkerTrigger?: (marker: VideoMarker) => void;
	private readonly onTimeUpdate?: (currentTime: number) => void;

	private readonly leadTimeSeconds: number;
	private readonly overshootTimeSeconds: number;
	private pendingSeekMarker: VideoMarker | null = null;
	private triggeredMarkerIds: Set<string> = new Set();
	private animationFrameId: number | null = null;
	private isRunning: boolean = false;

	constructor(options: VideoMarkerSchedulerOptions) {
		this.player = options.player;
		this.getMarkers = options.getMarkers ?? (() => []);
		this.leadTimeSeconds = (options.leadTimeMs ?? DEFAULT_LEAD_TIME_MS) / 1000;
		this.overshootTimeSeconds =
			(options.overshootTimeMs ?? MAX_OVERSHOOT_MS) / 1000;
		this.onMarkerTrigger = options.onMarkerTrigger;
		this.onTimeUpdate = options.onTimeUpdate;
	}

	public resetTriggeredMarkers() {
		this.triggeredMarkerIds.clear();
		this.pendingSeekMarker = null;
	}

	public start() {
		if (this.isRunning) {
			return;
		}
		this.isRunning = true;
		this.scheduleTick();
	}

	public stop() {
		this.isRunning = false;
		if (this.animationFrameId === null) {
			return;
		}

		cancelAnimationFrame(this.animationFrameId);
		this.animationFrameId = null;
	}

	public tick() {
		const currentTime = this.player.currentTime;
		this.onTimeUpdate?.(currentTime);

		for (const marker of this.getMarkers()) {
			if (this.triggeredMarkerIds.has(marker.id)) {
				continue;
			}

			const timeDelta = currentTime - marker.timestampSeconds;
			if (timeDelta < -this.leadTimeSeconds) {
				continue;
			}
			if (timeDelta > this.overshootTimeSeconds) {
				continue;
			}

			this.triggeredMarkerIds.add(marker.id);
			this.pendingSeekMarker = marker;
			this.stop();
			this.player.pause();
			this.onMarkerTrigger?.(marker);
			break;
		}
	}

	public handlePlay = () => {
		this.start();
	};

	public handlePause = () => {
		this.stop();
		if (!this.pendingSeekMarker) {
			return;
		}

		const targetTimestamp = this.pendingSeekMarker.timestampSeconds;
		this.pendingSeekMarker = null;
		this.player.currentTime = targetTimestamp;
		this.onTimeUpdate?.(targetTimestamp);
	};

	private scheduleTick = () => {
		if (!this.isRunning) {
			return;
		}

		this.tick();
		this.animationFrameId = requestAnimationFrame(this.scheduleTick);
	};
}
