/**
 * @fileOverview Synchronizes native media playback with timestamped video cues.
 *
 * Detects cue windows, pauses playback for interaction, and clamps playback to cue timestamps.
 */

import type { VideoCue, VideoPlayer, VideoSyncEngineOptions } from "./types";

const DEFAULT_LEAD_TIME_MS = 80;

export class VideoSyncEngine {
	private readonly player: VideoPlayer;
	private cues: readonly VideoCue[];
	private readonly leadTimeSeconds: number;
	private readonly onCueTrigger?: (cue: VideoCue) => void;
	private readonly onTimeUpdate?: (currentTime: number) => void;

	private pendingSeekClampCue: VideoCue | null = null;
	private triggeredCueIds: Set<string> = new Set();
	private rafId: number | null = null;
	private isRunning: boolean = false;

	constructor(options: VideoSyncEngineOptions) {
		this.player = options.player;
		this.cues = options.cues ?? [];
		this.leadTimeSeconds = (options.leadTimeMs ?? DEFAULT_LEAD_TIME_MS) / 1000;
		this.onCueTrigger = options.onCueTrigger;
		this.onTimeUpdate = options.onTimeUpdate;
	}

	public setCues(cues: readonly VideoCue[]): void {
		this.cues = cues;
	}

	public resetTriggeredCues(): void {
		this.triggeredCueIds.clear();
		this.pendingSeekClampCue = null;
	}

	public start(): void {
		if (this.isRunning) {
			return;
		}
		this.isRunning = true;
		this.scheduleTick();
	}

	public stop(): void {
		this.isRunning = false;
		if (this.rafId !== null) {
			cancelAnimationFrame(this.rafId);
			this.rafId = null;
		}
	}

	public tick(): void {
		const currentTime = this.player.currentTime;
		this.onTimeUpdate?.(currentTime);

		for (const cue of this.cues) {
			if (this.triggeredCueIds.has(cue.id)) {
				continue;
			}

			const threshold = cue.timestampSeconds - this.leadTimeSeconds;
			// Trigger anticipation pause when current playback enters the lead time window
			// but has not overshot by an unreasonable margin
			if (
				currentTime >= threshold &&
				currentTime <= cue.timestampSeconds + 0.5
			) {
				this.triggeredCueIds.add(cue.id);
				this.pendingSeekClampCue = cue;
				this.player.pause();
				this.onCueTrigger?.(cue);
				break;
			}
		}
	}

	public handlePlay(): void {
		this.start();
	}

	public handlePause(): void {
		this.stop();
		if (this.pendingSeekClampCue) {
			const targetTimestamp = this.pendingSeekClampCue.timestampSeconds;
			this.pendingSeekClampCue = null;
			this.player.currentTime = targetTimestamp;
		}
	}

	private scheduleTick = (): void => {
		if (!this.isRunning) {
			return;
		}
		this.tick();
		this.rafId = requestAnimationFrame(this.scheduleTick);
	};
}
