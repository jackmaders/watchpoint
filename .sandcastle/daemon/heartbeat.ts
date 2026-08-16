import type { WatcherClock } from "./types";

export class DefaultWatcherClock implements WatcherClock {
	async sleep(ms: number, signal?: AbortSignal): Promise<void> {
		if (signal?.aborted || ms <= 0) {
			return;
		}
		return new Promise((resolve) => {
			const timer = setTimeout(() => {
				if (signal) {
					signal.removeEventListener("abort", onAbort);
				}
				resolve();
			}, ms);

			const onAbort = () => {
				clearTimeout(timer);
				signal?.removeEventListener("abort", onAbort);
				resolve();
			};

			if (signal) {
				signal.addEventListener("abort", onAbort, { once: true });
			}
		});
	}

	now(): number {
		return Date.now();
	}
}

export class MockWatcherClock implements WatcherClock {
	private currentTime: number;
	private readonly sleepCalls: Array<{ ms: number; signal?: AbortSignal }> = [];
	private autoAdvanceTime = true;

	constructor(initialTime = 1700000000000) {
		this.currentTime = initialTime;
	}

	setAutoAdvance(enabled: boolean): void {
		this.autoAdvanceTime = enabled;
	}

	setTime(time: number): void {
		this.currentTime = time;
	}

	advanceTime(ms: number): void {
		this.currentTime += ms;
	}

	getSleepCalls(): readonly {
		readonly ms: number;
		readonly signal?: AbortSignal;
	}[] {
		return this.sleepCalls;
	}

	async sleep(ms: number, signal?: AbortSignal): Promise<void> {
		this.sleepCalls.push({ ms, signal });
		if (this.autoAdvanceTime) {
			this.currentTime += ms;
		}
		if (signal?.aborted) {
			return;
		}
	}

	now(): number {
		return this.currentTime;
	}
}

export interface HeartbeatCountdownOptions {
	readonly clock: WatcherClock;
	readonly durationSeconds: number;
	readonly output?: {
		write(chunk: string): boolean | undefined;
		isTTY?: boolean;
	};
	readonly logger?: (msg: string) => void;
	readonly signal?: AbortSignal;
}

export async function renderHeartbeatCountdown(
	options: HeartbeatCountdownOptions,
): Promise<void> {
	const { clock, durationSeconds, output, logger, signal } = options;

	if (durationSeconds <= 0 || signal?.aborted) {
		return;
	}

	if (output?.isTTY) {
		try {
			for (let sec = durationSeconds; sec > 0; sec--) {
				if (signal?.aborted) {
					break;
				}
				output.write(
					`\r\x1b[2K⏳ [Sandcastle Watcher] Queue empty. Next poll in ${sec}s... (Ctrl+C to stop)`,
				);
				await clock.sleep(1000, signal);
			}
		} finally {
			output.write("\r\x1b[2K");
		}
		return;
	}

	const timestamp = new Date(clock.now()).toISOString();
	logger?.(
		`[${timestamp}] [Sandcastle Watcher] Queue empty. Next poll in ${durationSeconds}s...`,
	);
	await clock.sleep(durationSeconds * 1000, signal);
}
