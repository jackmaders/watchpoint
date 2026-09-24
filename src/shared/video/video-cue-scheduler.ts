import type { VideoCue, VideoPlayer } from "./types";

const DEFAULT_LEAD_TIME_MS = 80;
const MAX_CUE_OVERSHOOT_MS = 500;

export interface VideoCueSchedulerOptions {
	readonly getCues?: () => readonly VideoCue[];
	readonly leadTimeMs?: number;
	readonly onCueTrigger?: (cue: VideoCue) => void;
	readonly onTimeUpdate?: (currentTime: number) => void;
	readonly overshootTimeMs?: number;
	readonly player: VideoPlayer;
}

/** Schedules timestamped video cues against native media playback. */
export class VideoCueScheduler {
	private readonly getCues: () => readonly VideoCue[];
	private readonly player: VideoPlayer;
	private readonly onCueTrigger?: (cue: VideoCue) => void;
	private readonly onTimeUpdate?: (currentTime: number) => void;

	private readonly leadTimeSeconds: number;
	private readonly overshootTimeSeconds: number;
	private pendingSeekCue: VideoCue | null = null;
	private triggeredCueIds: Set<string> = new Set();
	private animationFrameId: number | null = null;
	private isRunning: boolean = false;

	constructor(options: VideoCueSchedulerOptions) {
		this.player = options.player;
		this.getCues = options.getCues ?? (() => []);
		this.leadTimeSeconds = (options.leadTimeMs ?? DEFAULT_LEAD_TIME_MS) / 1000;
		this.overshootTimeSeconds =
			(options.overshootTimeMs ?? MAX_CUE_OVERSHOOT_MS) / 1000;
		this.onCueTrigger = options.onCueTrigger;
		this.onTimeUpdate = options.onTimeUpdate;
	}

	public resetTriggeredCues() {
		this.triggeredCueIds.clear();
		this.pendingSeekCue = null;
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
		if (this.animationFrameId === null) return;

		cancelAnimationFrame(this.animationFrameId);
		this.animationFrameId = null;
	}

	public tick() {
		const currentTime = this.player.currentTime;
		this.onTimeUpdate?.(currentTime);

		for (const cue of this.getCues()) {
			if (this.triggeredCueIds.has(cue.id)) continue;

			const timeDelta = currentTime - cue.timestampSeconds;
			if (timeDelta < -this.leadTimeSeconds) continue;
			if (timeDelta > this.overshootTimeSeconds) continue;

			this.triggeredCueIds.add(cue.id);
			this.pendingSeekCue = cue;
			this.player.pause();
			this.onCueTrigger?.(cue);
			break;
		}
	}

	public handlePlay = () => {
		this.start();
	};

	public handlePause = () => {
		this.stop();
		if (!this.pendingSeekCue) return;

		const targetTimestamp = this.pendingSeekCue.timestampSeconds;
		this.pendingSeekCue = null;
		this.player.currentTime = targetTimestamp;
	};

	private scheduleTick = () => {
		if (!this.isRunning) return;

		this.tick();
		this.animationFrameId = requestAnimationFrame(this.scheduleTick);
	};
}
