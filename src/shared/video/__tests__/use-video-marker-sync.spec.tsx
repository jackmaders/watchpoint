import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { VideoMarker, VideoMedia } from "../types";
import { useVideoMarkerSync } from "../use-video-marker-sync";

describe("useVideoMarkerSync", () => {
	let eventListeners: Map<string, EventListener>;

	const testMarker: VideoMarker = {
		id: "marker-1",
		timestampSeconds: 10,
	};

	function createMockPlayer(paused = true): VideoMedia {
		return {
			currentTime: 0,
			paused,
			pause: vi.fn(),
			addEventListener: vi.fn((type: string, listener: EventListener) => {
				eventListeners.set(type, listener);
			}),
			removeEventListener: vi.fn((type: string) => {
				eventListeners.delete(type);
			}),
		};
	}

	beforeEach(() => {
		eventListeners = new Map();
		vi.stubGlobal("requestAnimationFrame", vi.fn());
		vi.stubGlobal("cancelAnimationFrame", vi.fn());
	});

	test("returns default state when player is null", () => {
		const { result } = renderHook(() =>
			useVideoMarkerSync({
				player: null,
			}),
		);

		expect(result.current.currentTime).toBe(0);
		expect(typeof result.current.resetTriggeredMarkers).toBe("function");
		expect(() => result.current.resetTriggeredMarkers()).not.toThrow();
	});

	test("subscribes to player play and pause events on mount", () => {
		const mockPlayer = createMockPlayer();

		renderHook(() =>
			useVideoMarkerSync({
				player: mockPlayer,
			}),
		);

		expect(mockPlayer.addEventListener).toHaveBeenCalledWith(
			"play",
			expect.any(Function),
		);
		expect(mockPlayer.addEventListener).toHaveBeenCalledWith(
			"pause",
			expect.any(Function),
		);
	});

	test("automatically starts scheduler if player is already playing on mount", () => {
		const mockPlayer = createMockPlayer(false);

		renderHook(() =>
			useVideoMarkerSync({
				player: mockPlayer,
			}),
		);

		expect(requestAnimationFrame).toHaveBeenCalled();
	});

	test("cleans up event listeners and stops scheduler on unmount", () => {
		const mockPlayer = createMockPlayer();

		const { unmount } = renderHook(() =>
			useVideoMarkerSync({
				player: mockPlayer,
			}),
		);

		unmount();

		expect(mockPlayer.removeEventListener).toHaveBeenCalledWith(
			"play",
			expect.any(Function),
		);
		expect(mockPlayer.removeEventListener).toHaveBeenCalledWith(
			"pause",
			expect.any(Function),
		);
	});

	test("triggers marker and invokes onMarkerTrigger callback", () => {
		const mockPlayer = createMockPlayer();
		const onMarkerTrigger = vi.fn();
		mockPlayer.currentTime = 9.95;

		renderHook(() =>
			useVideoMarkerSync({
				markers: [testMarker],
				onMarkerTrigger,
				player: mockPlayer,
			}),
		);

		// Trigger play event
		const playListener = eventListeners.get("play");
		expect(playListener).toBeDefined();

		act(() => {
			if (typeof playListener === "function") {
				playListener(new Event("play"));
			}
		});

		expect(onMarkerTrigger).toHaveBeenCalledWith(testMarker);
		expect(mockPlayer.pause).toHaveBeenCalledTimes(1);
	});

	test("forwards onTimeUpdate and throttles currentTime state updates", () => {
		const mockPlayer = createMockPlayer();
		const onTimeUpdate = vi.fn();
		mockPlayer.currentTime = 1.02;

		const { result } = renderHook(() =>
			useVideoMarkerSync({
				onTimeUpdate,
				player: mockPlayer,
			}),
		);

		const playListener = eventListeners.get("play");
		act(() => {
			if (typeof playListener === "function") {
				playListener(new Event("play"));
			}
		});

		expect(onTimeUpdate).toHaveBeenCalledWith(1.02);
		expect(result.current.currentTime).toBe(1.02);
	});

	test("resetTriggeredMarkers clears triggered markers on active scheduler", () => {
		const mockPlayer = createMockPlayer();
		const onMarkerTrigger = vi.fn();
		mockPlayer.currentTime = 9.95;

		const { result } = renderHook(() =>
			useVideoMarkerSync({
				markers: [testMarker],
				onMarkerTrigger,
				player: mockPlayer,
			}),
		);

		const playListener = eventListeners.get("play");
		act(() => {
			if (typeof playListener === "function") {
				playListener(new Event("play"));
			}
		});
		expect(onMarkerTrigger).toHaveBeenCalledTimes(1);

		act(() => {
			result.current.resetTriggeredMarkers();
			if (typeof playListener === "function") {
				playListener(new Event("play"));
			}
		});

		expect(onMarkerTrigger).toHaveBeenCalledTimes(2);
	});
});
