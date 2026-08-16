import { describe, expect, it } from "vitest";
import {
	DefaultWatcherClock,
	MockWatcherClock,
	renderHeartbeatCountdown,
} from "../heartbeat";

class MockOutputStream {
	readonly chunks: string[] = [];
	isTTY: boolean;

	constructor(isTTY = true) {
		this.isTTY = isTTY;
	}

	write(chunk: string): boolean {
		this.chunks.push(chunk);
		return true;
	}

	getOutput(): string {
		return this.chunks.join("");
	}
}

describe("DefaultWatcherClock", () => {
	it("returns immediately if sleep duration is 0 or negative", async () => {
		// Arrange
		const clock = new DefaultWatcherClock();

		// Act
		await clock.sleep(0);
		await clock.sleep(-10);

		// Assert
		expect(clock.now()).toBeGreaterThan(0);
	});

	it("returns immediately if signal is already aborted", async () => {
		// Arrange
		const clock = new DefaultWatcherClock();
		const controller = new AbortController();
		controller.abort();

		// Act
		await clock.sleep(5000, controller.signal);

		// Assert
		expect(controller.signal.aborted).toBe(true);
	});

	it("resolves when timer expires without signal", async () => {
		// Arrange
		const clock = new DefaultWatcherClock();

		// Act
		await clock.sleep(1);

		// Assert
		expect(clock.now()).toBeGreaterThan(0);
	});

	it("resolves and removes abort listener when timer expires naturally with signal", async () => {
		// Arrange
		const clock = new DefaultWatcherClock();
		const controller = new AbortController();

		// Act
		await clock.sleep(1, controller.signal);

		// Assert
		expect(controller.signal.aborted).toBe(false);
	});

	it("resolves early when signal is aborted during sleep", async () => {
		// Arrange
		const clock = new DefaultWatcherClock();
		const controller = new AbortController();

		// Act
		const sleepPromise = clock.sleep(1000, controller.signal);
		controller.abort();
		await sleepPromise;

		// Assert
		expect(controller.signal.aborted).toBe(true);
	});

	it("now() returns current timestamp", () => {
		// Arrange
		const clock = new DefaultWatcherClock();
		const before = Date.now();

		// Act
		const current = clock.now();

		// Assert
		expect(current).toBeGreaterThanOrEqual(before);
	});
});

describe("MockWatcherClock", () => {
	it("records sleep calls and advances mock time automatically", async () => {
		// Arrange
		const clock = new MockWatcherClock(1000);

		// Act
		await clock.sleep(500);

		// Assert
		expect(clock.now()).toBe(1500);
		expect(clock.getSleepCalls()).toEqual([{ ms: 500, signal: undefined }]);
	});

	it("supports manual time manipulation and disabling auto advance", async () => {
		// Arrange
		const clock = new MockWatcherClock(1000);
		clock.setAutoAdvance(false);

		// Act
		clock.setTime(2000);
		clock.advanceTime(500);
		await clock.sleep(300);

		// Assert
		expect(clock.now()).toBe(2500);
	});

	it("handles sleep with aborted signal", async () => {
		// Arrange
		const clock = new MockWatcherClock(1000);
		const controller = new AbortController();
		controller.abort();

		// Act
		await clock.sleep(500, controller.signal);

		// Assert
		expect(clock.getSleepCalls().length).toBe(1);
	});
});

describe("renderHeartbeatCountdown", () => {
	it("returns immediately if durationSeconds is 0 or negative", async () => {
		// Arrange
		const clock = new MockWatcherClock();
		const output = new MockOutputStream(true);

		// Act
		await renderHeartbeatCountdown({ clock, durationSeconds: 0, output });
		await renderHeartbeatCountdown({ clock, durationSeconds: -5, output });

		// Assert
		expect(output.chunks).toEqual([]);
	});

	it("returns immediately if signal is already aborted", async () => {
		// Arrange
		const clock = new MockWatcherClock();
		const output = new MockOutputStream(true);
		const controller = new AbortController();
		controller.abort();

		// Act
		await renderHeartbeatCountdown({
			clock,
			durationSeconds: 10,
			output,
			signal: controller.signal,
		});

		// Assert
		expect(output.chunks).toEqual([]);
	});

	it("renders ANSI countdown every second on TTY output and cleans up line", async () => {
		// Arrange
		const clock = new MockWatcherClock();
		const output = new MockOutputStream(true);

		// Act
		await renderHeartbeatCountdown({
			clock,
			durationSeconds: 3,
			output,
		});

		// Assert
		expect(output.chunks).toEqual([
			"\r\x1b[2K⏳ [Sandcastle Watcher] Queue empty. Next poll in 3s... (Ctrl+C to stop)",
			"\r\x1b[2K⏳ [Sandcastle Watcher] Queue empty. Next poll in 2s... (Ctrl+C to stop)",
			"\r\x1b[2K⏳ [Sandcastle Watcher] Queue empty. Next poll in 1s... (Ctrl+C to stop)",
			"\r\x1b[2K",
		]);
	});

	it("breaks TTY countdown early if signal aborts during tick loop", async () => {
		// Arrange
		const clock = new MockWatcherClock();
		const output = new MockOutputStream(true);
		const controller = new AbortController();

		clock.setAutoAdvance(false);
		const originalSleep = clock.sleep.bind(clock);
		clock.sleep = async (ms, signal) => {
			await originalSleep(ms, signal);
			controller.abort();
		};

		// Act
		await renderHeartbeatCountdown({
			clock,
			durationSeconds: 5,
			output,
			signal: controller.signal,
		});

		// Assert
		expect(output.chunks.length).toBe(2);
		expect(output.chunks[0]).toContain("Next poll in 5s...");
		expect(output.chunks[1]).toBe("\r\x1b[2K");
	});

	it("renders single timestamped log line and sleeps once for non-TTY output", async () => {
		// Arrange
		const clock = new MockWatcherClock(1700000000000);
		const output = new MockOutputStream(false);
		const logs: string[] = [];
		const logger = (msg: string) => logs.push(msg);

		// Act
		await renderHeartbeatCountdown({
			clock,
			durationSeconds: 30,
			logger,
			output,
		});

		// Assert
		expect(logs).toEqual([
			`[${new Date(1700000000000).toISOString()}] [Sandcastle Watcher] Queue empty. Next poll in 30s...`,
		]);
		expect(clock.getSleepCalls()).toEqual([{ ms: 30000, signal: undefined }]);
	});

	it("supports non-TTY without logger or output stream", async () => {
		// Arrange
		const clock = new MockWatcherClock(1700000000000);

		// Act
		await renderHeartbeatCountdown({
			clock,
			durationSeconds: 15,
		});

		// Assert
		expect(clock.getSleepCalls()).toEqual([{ ms: 15000, signal: undefined }]);
	});
});
