/**
 * @fileOverview Tests cue timing and corrective seeking against native media behavior.
 *
 * Verifies that the vendor-neutral scheduler pauses playback and clamps the media timestamp at cues.
 */

import { describe, expect, test, vi } from "vitest";
import { VideoSyncEngine } from "../sync-engine";
import type { VideoCue } from "../types";

interface MockMedia {
	currentTime: number;
	pause: () => void;
	paused: boolean;
}

function createMockMedia(overrides: Partial<MockMedia> = {}): MockMedia {
	return {
		currentTime: 0,
		paused: true,
		pause: vi.fn<() => void>(),
		...overrides,
	};
}

function createEngine(
	media: MockMedia,
	options: Omit<
		ConstructorParameters<typeof VideoSyncEngine>[0],
		"player"
	> = {},
) {
	return new VideoSyncEngine({
		player: media,
		...options,
	});
}

describe("VideoSyncEngine", () => {
	test("fires cue trigger and pauses when currentTime enters anticipation window", () => {
		const cue: VideoCue = { id: "q1", timestampSeconds: 10.0 };
		const onCueTrigger = vi.fn();
		const media = createMockMedia({ currentTime: 9.925 });
		const engine = createEngine(media, {
			cues: [cue],
			leadTimeMs: 80,
			onCueTrigger,
		});

		engine.tick();

		expect(onCueTrigger).toHaveBeenCalledTimes(1);
		expect(onCueTrigger).toHaveBeenCalledWith(cue);
		expect(media.pause).toHaveBeenCalledTimes(1);
	});

	test("does not trigger cue before anticipation window is entered", () => {
		const cue: VideoCue = { id: "q1", timestampSeconds: 10.0 };
		const onCueTrigger = vi.fn();
		const media = createMockMedia({ currentTime: 9.9 });
		const engine = createEngine(media, {
			cues: [cue],
			leadTimeMs: 80,
			onCueTrigger,
		});

		engine.tick();

		expect(onCueTrigger).not.toHaveBeenCalled();
		expect(media.pause).not.toHaveBeenCalled();
	});

	test("seeks to the cue timestamp when the media pause is observed", () => {
		const cue: VideoCue = { id: "q1", timestampSeconds: 10.0 };
		const media = createMockMedia({ currentTime: 9.95 });
		const engine = createEngine(media, { cues: [cue] });

		engine.tick();
		engine.handlePause();

		expect(media.currentTime).toBe(10.0);
	});

	test("does not seek when media is paused without an anticipation trigger", () => {
		const media = createMockMedia({ currentTime: 5.0 });
		const engine = createEngine(media, {
			cues: [{ id: "q1", timestampSeconds: 10.0 }],
		});

		engine.handlePause();

		expect(media.currentTime).toBe(5.0);
	});

	test("updates cues without rebuilding the media integration", () => {
		const media = createMockMedia({ currentTime: 5.0 });
		const onCueTrigger = vi.fn();
		const engine = createEngine(media, { onCueTrigger });

		engine.setCues([{ id: "q1", timestampSeconds: 5.0 }]);
		engine.tick();

		expect(onCueTrigger).toHaveBeenCalledTimes(1);
	});
});
