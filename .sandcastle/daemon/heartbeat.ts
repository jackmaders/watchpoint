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
