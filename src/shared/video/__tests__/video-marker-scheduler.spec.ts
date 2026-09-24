import { beforeEach, describe, expect, test, vi } from "vitest";
import { VideoMarkerScheduler } from "../video-marker-scheduler";
import type { VideoMarker, VideoPlayer } from "../video-types";

describe("VideoMarkerScheduler", () => {
	let mockPlayer: VideoPlayer;
	let onMarkerTrigger: (marker: VideoMarker) => void;
	let onTimeUpdate: (currentTime: number) => void;

	const testMarker: VideoMarker = {
		id: "marker-1",
		timestampSeconds: 10,
	};

	beforeEach(() => {
		mockPlayer = {
			currentTime: 0,
			pause: vi.fn(),
		};
		onMarkerTrigger = vi.fn();
		onTimeUpdate = vi.fn();
		vi.stubGlobal("requestAnimationFrame", vi.fn());
		vi.stubGlobal("cancelAnimationFrame", vi.fn());
	});

	test("emits onTimeUpdate on every tick", () => {
		mockPlayer.currentTime = 5.5;
		const scheduler = new VideoMarkerScheduler({
			player: mockPlayer,
			onTimeUpdate,
		});

		scheduler.tick();

		expect(onTimeUpdate).toHaveBeenCalledWith(5.5);
	});

	test("triggers marker and halts scheduler when within anticipation lead time", () => {
		mockPlayer.currentTime = 9.93; // 70ms ahead of 10s marker (default lead time is 80ms)
		const scheduler = new VideoMarkerScheduler({
			player: mockPlayer,
			getMarkers: () => [testMarker],
			onMarkerTrigger,
			onTimeUpdate,
		});

		const stopSpy = vi.spyOn(scheduler, "stop");
		scheduler.tick();

		expect(onMarkerTrigger).toHaveBeenCalledWith(testMarker);
		expect(mockPlayer.pause).toHaveBeenCalledTimes(1);
		expect(stopSpy).toHaveBeenCalledTimes(1);
	});

	test("does not trigger marker if currentTime has not reached anticipation window", () => {
		mockPlayer.currentTime = 9.8; // 200ms ahead (exceeds 80ms lead time)
		const scheduler = new VideoMarkerScheduler({
			player: mockPlayer,
			getMarkers: () => [testMarker],
			onMarkerTrigger,
		});

		scheduler.tick();

		expect(onMarkerTrigger).not.toHaveBeenCalled();
		expect(mockPlayer.pause).not.toHaveBeenCalled();
	});

	test("does not trigger marker if currentTime exceeds max overshoot window", () => {
		mockPlayer.currentTime = 10.6; // 600ms past marker (exceeds default 500ms max overshoot)
		const scheduler = new VideoMarkerScheduler({
			player: mockPlayer,
			getMarkers: () => [testMarker],
			onMarkerTrigger,
		});

		scheduler.tick();

		expect(onMarkerTrigger).not.toHaveBeenCalled();
		expect(mockPlayer.pause).not.toHaveBeenCalled();
	});

	test("does not re-trigger an already triggered marker on subsequent ticks", () => {
		mockPlayer.currentTime = 9.95;
		const scheduler = new VideoMarkerScheduler({
			player: mockPlayer,
			getMarkers: () => [testMarker],
			onMarkerTrigger,
		});

		scheduler.tick();
		expect(onMarkerTrigger).toHaveBeenCalledTimes(1);

		scheduler.tick();
		expect(onMarkerTrigger).toHaveBeenCalledTimes(1);
	});

	test("snaps player currentTime to exact marker timestamp and notifies onTimeUpdate on pause", () => {
		mockPlayer.currentTime = 9.95;
		const scheduler = new VideoMarkerScheduler({
			player: mockPlayer,
			getMarkers: () => [testMarker],
			onMarkerTrigger,
			onTimeUpdate,
		});

		scheduler.tick();
		expect(mockPlayer.currentTime).toBe(9.95);

		scheduler.handlePause();

		expect(mockPlayer.currentTime).toBe(10);
		expect(onTimeUpdate).toHaveBeenCalledWith(10);
	});

	test("handlePause does not alter currentTime if no marker was triggered", () => {
		mockPlayer.currentTime = 3.5;
		const scheduler = new VideoMarkerScheduler({
			player: mockPlayer,
			onTimeUpdate,
		});

		scheduler.handlePause();

		expect(mockPlayer.currentTime).toBe(3.5);
	});

	test("resetTriggeredMarkers allows previously triggered marker to fire again", () => {
		mockPlayer.currentTime = 9.95;
		const scheduler = new VideoMarkerScheduler({
			player: mockPlayer,
			getMarkers: () => [testMarker],
			onMarkerTrigger,
		});

		scheduler.tick();
		expect(onMarkerTrigger).toHaveBeenCalledTimes(1);

		scheduler.resetTriggeredMarkers();
		scheduler.tick();

		expect(onMarkerTrigger).toHaveBeenCalledTimes(2);
	});

	test("start and stop manage animation frame scheduling", () => {
		const scheduler = new VideoMarkerScheduler({
			player: mockPlayer,
		});

		scheduler.start();
		expect(requestAnimationFrame).toHaveBeenCalledTimes(1);

		// Calling start again while already running should be a no-op
		scheduler.start();
		expect(requestAnimationFrame).toHaveBeenCalledTimes(1);

		scheduler.stop();
		expect(cancelAnimationFrame).toHaveBeenCalledTimes(1);
	});

	test("handlePlay starts the scheduler", () => {
		const scheduler = new VideoMarkerScheduler({
			player: mockPlayer,
		});

		scheduler.handlePlay();
		expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
	});
});
