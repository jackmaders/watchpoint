import { describe, expect, test, vi } from "vitest";
import {
	type YouTubeCue,
	type YouTubePlayerAdapter,
	YouTubeSyncEngine,
} from "../index";

function createMockPlayer(
	overrides: Partial<YouTubePlayerAdapter> = {},
): YouTubePlayerAdapter {
	return {
		getCurrentTime: vi.fn(() => 0),
		getPlayerState: vi.fn(() => 1), // 1 = PLAYING
		getPlaybackRate: vi.fn(() => 1),
		getVolume: vi.fn(() => 100),
		isMuted: vi.fn(() => false),
		pauseVideo: vi.fn(),
		playVideo: vi.fn(),
		seekTo: vi.fn(),
		setPlaybackRate: vi.fn(),
		setVolume: vi.fn(),
		mute: vi.fn(),
		unMute: vi.fn(),
		...overrides,
	};
}

// biome-ignore lint/security/noSecrets: test suite name
describe("YouTubeSyncEngine", () => {
	test("fires cue trigger and calls pauseVideo when currentTime enters anticipation window", () => {
		const cue: YouTubeCue = { id: "q1", timestampSeconds: 10.0 };
		const onCueTrigger = vi.fn();
		const mockPlayer = createMockPlayer({
			// 10.0s cue with 80ms lead time triggers at >= 9.92s
			getCurrentTime: vi.fn(() => 9.925),
		});

		const engine = new YouTubeSyncEngine({
			player: mockPlayer,
			cues: [cue],
			leadTimeMs: 80,
			onCueTrigger,
		});

		engine.tick();

		expect(onCueTrigger).toHaveBeenCalledTimes(1);
		expect(onCueTrigger).toHaveBeenCalledWith(cue);
		expect(mockPlayer.pauseVideo).toHaveBeenCalledTimes(1);
	});

	test("does not trigger cue before anticipation window is entered", () => {
		const cue: YouTubeCue = { id: "q1", timestampSeconds: 10.0 };
		const onCueTrigger = vi.fn();
		const mockPlayer = createMockPlayer({
			// 9.90s is before the 9.92s anticipation threshold (10.0 - 0.080)
			getCurrentTime: vi.fn(() => 9.9),
		});

		const engine = new YouTubeSyncEngine({
			player: mockPlayer,
			cues: [cue],
			leadTimeMs: 80,
			onCueTrigger,
		});

		engine.tick();

		expect(onCueTrigger).not.toHaveBeenCalled();
		expect(mockPlayer.pauseVideo).not.toHaveBeenCalled();
	});

	test("performs corrective seek clamp to exact cue timestamp when player transitions to PAUSED", () => {
		const cue: YouTubeCue = { id: "q1", timestampSeconds: 10.0 };
		const mockPlayer = createMockPlayer({
			getCurrentTime: vi.fn(() => 9.95),
		});

		const engine = new YouTubeSyncEngine({
			player: mockPlayer,
			cues: [cue],
			leadTimeMs: 80,
		});

		// Trigger anticipation
		engine.tick();
		expect(mockPlayer.pauseVideo).toHaveBeenCalledTimes(1);

		// YouTube player asynchronously transitions to PAUSED (2)
		engine.handlePlayerStateChange(2); // 2 = PAUSED

		expect(mockPlayer.seekTo).toHaveBeenCalledWith(10.0, true);
	});

	test("does not trigger corrective seek when paused manually without anticipation trigger", () => {
		const mockPlayer = createMockPlayer({
			getCurrentTime: vi.fn(() => 5.0),
		});

		const engine = new YouTubeSyncEngine({
			player: mockPlayer,
			cues: [{ id: "q1", timestampSeconds: 10.0 }],
		});

		// User manually pauses
		engine.handlePlayerStateChange(2); // 2 = PAUSED

		expect(mockPlayer.seekTo).not.toHaveBeenCalled();
	});

	test("persists and restores player settings (rate, volume, mute)", () => {
		const mockPlayer = createMockPlayer({
			getPlaybackRate: vi.fn(() => 1.5),
			getVolume: vi.fn(() => 75),
			isMuted: vi.fn(() => true),
		});

		const engine = new YouTubeSyncEngine({ player: mockPlayer });

		const snapshot = engine.snapshotSettings();
		expect(snapshot).toEqual({
			playbackRate: 1.5,
			volume: 75,
			isMuted: true,
		});

		// Create another player instance and restore settings to it
		const targetPlayer = createMockPlayer();
		engine.restoreSettings(targetPlayer, snapshot);

		expect(targetPlayer.setPlaybackRate).toHaveBeenCalledWith(1.5);
		expect(targetPlayer.setVolume).toHaveBeenCalledWith(75);
		expect(targetPlayer.mute).toHaveBeenCalledTimes(1);
	});
});
