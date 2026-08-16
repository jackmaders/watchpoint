import type { WatcherClock } from "../types";

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
