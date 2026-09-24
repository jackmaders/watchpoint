import type {
	YouTubeCue,
	YouTubePlayerAdapter,
	YouTubePlayerSettings,
	YouTubeSyncEngineOptions,
} from "./types";

const DEFAULT_LEAD_TIME_MS = 80;
const YT_PLAYING = 1;
const YT_PAUSED = 2;

export class YouTubeSyncEngine {
	private readonly player: YouTubePlayerAdapter;
	private cues: readonly YouTubeCue[];
	private readonly leadTimeSeconds: number;
	private readonly onCueTrigger?: (cue: YouTubeCue) => void;
	private readonly onStateChange?: (state: number) => void;
	private readonly onTimeUpdate?: (currentTime: number) => void;

	private pendingSeekClampCue: YouTubeCue | null = null;
	private triggeredCueIds: Set<string> = new Set();
	private rafId: number | null = null;
	private isRunning: boolean = false;

	constructor(options: YouTubeSyncEngineOptions) {
		this.player = options.player;
		this.cues = options.cues ?? [];
		this.leadTimeSeconds = (options.leadTimeMs ?? DEFAULT_LEAD_TIME_MS) / 1000;
		this.onCueTrigger = options.onCueTrigger;
		this.onStateChange = options.onStateChange;
		this.onTimeUpdate = options.onTimeUpdate;
	}

	public setCues(cues: readonly YouTubeCue[]): void {
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
		const currentTime = this.player.getCurrentTime();
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
				this.player.pauseVideo();
				this.onCueTrigger?.(cue);
				break;
			}
		}
	}

	public handlePlayerStateChange(state: number): void {
		this.onStateChange?.(state);

		if (state === YT_PLAYING) {
			this.start();
			return;
		}

		if (state === YT_PAUSED) {
			this.stop();
			if (this.pendingSeekClampCue) {
				const targetTimestamp = this.pendingSeekClampCue.timestampSeconds;
				this.pendingSeekClampCue = null;
				this.player.seekTo(targetTimestamp, true);
			}
		}
	}

	public snapshotSettings(): YouTubePlayerSettings {
		return {
			isMuted: this.player.isMuted(),
			playbackRate: this.player.getPlaybackRate(),
			volume: this.player.getVolume(),
		};
	}

	public restoreSettings(
		targetPlayer: YouTubePlayerAdapter,
		settings: YouTubePlayerSettings,
	): void {
		targetPlayer.setPlaybackRate(settings.playbackRate);
		targetPlayer.setVolume(settings.volume);
		if (settings.isMuted) {
			targetPlayer.mute();
		} else {
			targetPlayer.unMute();
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
