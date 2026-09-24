import {
	useCallback,
	useEffect,
	useEffectEvent,
	useRef,
	useState,
} from "react";
import type { VideoCue, VideoMedia } from "./types";
import { VideoCueScheduler } from "./video-cue-scheduler";

/** Number of state updates per second. */
const UPDATE_THROTTLE_HZ = 10;

export interface UseVideoCueSyncOptions {
	readonly cues?: readonly VideoCue[];
	readonly leadTimeMs?: number;
	readonly onCueTrigger?: (cue: VideoCue) => void;
	readonly onTimeUpdate?: (currentTime: number) => void;
	readonly overshootTimeMs?: number;
	readonly player: VideoMedia | null;
}

export function useVideoCueSync(options: UseVideoCueSyncOptions) {
	const {
		player,
		cues,
		leadTimeMs,
		overshootTimeMs,
		onCueTrigger,
		onTimeUpdate,
	} = options;

	const schedulerRef = useRef<VideoCueScheduler | null>(null);

	const lastThrottledBucketRef = useRef(-1);
	const [throttledTime, setThrottledTime] = useState(0);

	const handleCueTrigger = useEffectEvent((cue: VideoCue) =>
		onCueTrigger?.(cue),
	);
	const handleTimeUpdate = useEffectEvent((currentTime: number) => {
		onTimeUpdate?.(currentTime);

		const nextBucket = Math.floor(currentTime * UPDATE_THROTTLE_HZ);
		if (nextBucket !== lastThrottledBucketRef.current) {
			lastThrottledBucketRef.current = nextBucket;
			setThrottledTime(currentTime);
		}
	});

	const getLatestCues = useEffectEvent(() => cues ?? []);

	const resetTriggeredCues = useCallback(() => {
		schedulerRef.current?.resetTriggeredCues();
	}, []);

	useEffect(() => {
		if (!player) {
			schedulerRef.current = null;
			return;
		}

		const scheduler = new VideoCueScheduler({
			player,
			getCues: getLatestCues,
			leadTimeMs,
			overshootTimeMs,
			onCueTrigger: handleCueTrigger,
			onTimeUpdate: handleTimeUpdate,
		});

		schedulerRef.current = scheduler;

		player.addEventListener("play", scheduler.handlePlay);
		player.addEventListener("pause", scheduler.handlePause);

		if (!player.paused) {
			scheduler.handlePlay();
		}

		return () => {
			player.removeEventListener("play", scheduler.handlePlay);
			player.removeEventListener("pause", scheduler.handlePause);
			scheduler.stop();
			schedulerRef.current = null;
		};
	}, [leadTimeMs, overshootTimeMs, player]);

	return { currentTime: throttledTime, resetTriggeredCues };
}
