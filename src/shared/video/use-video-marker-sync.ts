import {
	useCallback,
	useEffect,
	useEffectEvent,
	useRef,
	useState,
} from "react";
import { VideoMarkerScheduler } from "./video-marker-scheduler";
import type { VideoMarker, VideoMedia } from "./video-types";

/** Number of state updates per second. */
const UPDATE_THROTTLE_HZ = 10;

export interface UseVideoMarkerSyncOptions {
	readonly leadTimeMs?: number;
	readonly markers?: readonly VideoMarker[];
	readonly onMarkerTrigger?: (marker: VideoMarker) => void;
	readonly onTimeUpdate?: (currentTime: number) => void;
	readonly overshootTimeMs?: number;
	readonly player: VideoMedia | null;
}

export function useVideoMarkerSync(options: UseVideoMarkerSyncOptions) {
	const {
		player,
		markers,
		leadTimeMs,
		overshootTimeMs,
		onMarkerTrigger,
		onTimeUpdate,
	} = options;

	const schedulerRef = useRef<VideoMarkerScheduler | null>(null);

	const lastThrottledBucketRef = useRef(-1);
	const [throttledTime, setThrottledTime] = useState(0);

	const handleMarkerTrigger = useEffectEvent((marker: VideoMarker) =>
		onMarkerTrigger?.(marker),
	);
	const handleTimeUpdate = useEffectEvent((currentTime: number) => {
		onTimeUpdate?.(currentTime);

		const nextBucket = Math.floor(currentTime * UPDATE_THROTTLE_HZ);
		if (nextBucket !== lastThrottledBucketRef.current) {
			lastThrottledBucketRef.current = nextBucket;
			setThrottledTime(currentTime);
		}
	});

	const getMarkers = useEffectEvent(() => markers ?? []);

	const resetTriggeredMarkers = useCallback(() => {
		schedulerRef.current?.resetTriggeredMarkers();
	}, []);

	useEffect(() => {
		if (!player) {
			schedulerRef.current = null;
			return;
		}

		const scheduler = new VideoMarkerScheduler({
			player,
			getMarkers,
			leadTimeMs,
			overshootTimeMs,
			onMarkerTrigger: handleMarkerTrigger,
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

	return {
		currentTime: throttledTime,
		resetTriggeredMarkers,
	};
}
