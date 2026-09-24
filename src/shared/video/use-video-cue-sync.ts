/**
 * @fileOverview Connects a native media element to Watchpoint's cue scheduler.
 *
 * Keeps cue timing and playback interruption behavior local while a player package owns generic media controls.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { VideoSyncEngine } from "./sync-engine";
import type { VideoCue, VideoMedia } from "./types";

export interface UseVideoCueSyncOptions {
	readonly cues?: readonly VideoCue[];
	readonly leadTimeMs?: number;
	readonly onCueTrigger?: (cue: VideoCue) => void;
	readonly onTimeUpdate?: (currentTime: number) => void;
	readonly player: VideoMedia | null;
}

export interface UseVideoCueSyncReturn {
	readonly currentTime: number;
	readonly resetTriggeredCues: () => void;
}

export function useVideoCueSync(
	options: UseVideoCueSyncOptions,
): UseVideoCueSyncReturn {
	const { player, cues, leadTimeMs, onCueTrigger, onTimeUpdate } = options;
	const engineRef = useRef<VideoSyncEngine | null>(null);
	const callbacksRef = useRef({ onCueTrigger, onTimeUpdate });
	const cuesRef = useRef(cues);
	const publishedTimeBucketRef = useRef(-1);
	const [currentTime, setCurrentTime] = useState(0);

	useEffect(() => {
		callbacksRef.current = { onCueTrigger, onTimeUpdate };
	}, [onCueTrigger, onTimeUpdate]);

	useEffect(() => {
		cuesRef.current = cues;
		engineRef.current?.setCues(cues ?? []);
	}, [cues]);

	useEffect(() => {
		if (!player) {
			engineRef.current = null;
			return;
		}

		const engine = new VideoSyncEngine({
			player,
			cues: cuesRef.current,
			leadTimeMs,
			onCueTrigger: (cue) => callbacksRef.current.onCueTrigger?.(cue),
			onTimeUpdate: (nextTime) => {
				callbacksRef.current.onTimeUpdate?.(nextTime);

				// The scheduler remains frame-accurate, but the display only needs
				// a modest update rate to avoid rerendering the page every frame.
				const nextBucket = Math.floor(nextTime * 10);
				if (nextBucket !== publishedTimeBucketRef.current) {
					publishedTimeBucketRef.current = nextBucket;
					setCurrentTime(nextTime);
				}
			},
		});

		engineRef.current = engine;

		const handlePlay = () => engine.handlePlay();
		const handlePause = () => engine.handlePause();
		player.addEventListener("play", handlePlay);
		player.addEventListener("pause", handlePause);

		if (!player.paused) {
			engine.handlePlay();
		}

		return () => {
			player.removeEventListener("play", handlePlay);
			player.removeEventListener("pause", handlePause);
			engine.stop();
			engineRef.current = null;
		};
	}, [leadTimeMs, player]);

	const resetTriggeredCues = useCallback(() => {
		engineRef.current?.resetTriggeredCues();
	}, []);

	return { currentTime, resetTriggeredCues };
}
