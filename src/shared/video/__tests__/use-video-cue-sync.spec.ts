/**
 * @fileOverview Tests the React binding between native media events and cue synchronization.
 *
 * Verifies event subscription, cue callbacks, throttled readout updates, and cleanup on replacement.
 */

import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { VideoCue, VideoMedia } from "../types";
import { useVideoCueSync } from "../use-video-cue-sync";

function createMockMedia() {
	const listeners = new Map<string, Set<EventListener>>();
	const media = {
		currentTime: 0,
		paused: true,
		pause: vi.fn(),
		addEventListener: vi.fn((type: string, listener: EventListener) => {
			const typeListeners = listeners.get(type) ?? new Set<EventListener>();
			typeListeners.add(listener);
			listeners.set(type, typeListeners);
		}),
		removeEventListener: vi.fn((type: string, listener: EventListener) => {
			listeners.get(type)?.delete(listener);
		}),
	};

	return Object.assign(media, {
		emit(type: string) {
			for (const listener of listeners.get(type) ?? []) {
				listener(new Event(type));
			}
		},
	}) satisfies VideoMedia & { emit: (type: string) => void };
}

afterEach(() => {
	vi.restoreAllMocks();
});

// biome-ignore lint/security/noSecrets: Test suite name is not a secret.
describe("useVideoCueSync", () => {
	test("starts the scheduler from media play and triggers cues", () => {
		vi.stubGlobal(
			"requestAnimationFrame",
			vi.fn(() => 1),
		);
		vi.stubGlobal("cancelAnimationFrame", vi.fn());

		const media = createMockMedia();
		const cue: VideoCue = { id: "q1", timestampSeconds: 10 };
		const onCueTrigger = vi.fn();
		const { result } = renderHook(() =>
			useVideoCueSync({
				cues: [cue],
				onCueTrigger,
				player: media,
			}),
		);

		media.currentTime = 9.95;
		act(() => media.emit("play"));

		expect(onCueTrigger).toHaveBeenCalledWith(cue);
		expect(result.current.currentTime).toBe(9.95);
	});

	test("removes media listeners when the player changes", () => {
		const firstMedia = createMockMedia();
		const secondMedia = createMockMedia();
		const { rerender, unmount } = renderHook(
			({ player }) => useVideoCueSync({ player }),
			{ initialProps: { player: firstMedia } },
		);

		rerender({ player: secondMedia });
		unmount();

		expect(firstMedia.removeEventListener).toHaveBeenCalledWith(
			"play",
			expect.any(Function),
		);
		expect(secondMedia.removeEventListener).toHaveBeenCalledWith(
			"pause",
			expect.any(Function),
		);
	});
});
