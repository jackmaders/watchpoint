import { useCallback, useEffect, useRef, useState } from "react";
import { loadYouTubeIframeApi } from "./load-api";
import { YouTubeSyncEngine } from "./sync-engine";
import type { YouTubeCue, YouTubePlayerAdapter } from "./types";

export interface UseYouTubePlayerOptions {
	readonly containerElement: HTMLElement | null;
	readonly cues?: readonly YouTubeCue[];
	readonly leadTimeMs?: number;
	readonly onCueTrigger?: (cue: YouTubeCue) => void;
	readonly onReady?: () => void;
	readonly onStateChange?: (state: number) => void;
	readonly onTimeUpdate?: (currentTime: number) => void;
	readonly playerVars?: YT.PlayerVars;
	readonly videoId: string;
}

export interface UseYouTubePlayerReturn {
	readonly currentTime: number;
	readonly isMuted: boolean;
	readonly isReady: boolean;
	readonly mute: () => void;
	readonly pause: () => void;
	readonly play: () => void;
	readonly playbackRate: number;
	readonly playerState: number;
	readonly seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
	readonly setPlaybackRate: (rate: number) => void;
	readonly setVolume: (volume: number) => void;
	readonly unMute: () => void;
	readonly updateCues: (cues: readonly YouTubeCue[]) => void;
	readonly volume: number;
}

export function useYouTubePlayer(
	options: UseYouTubePlayerOptions,
): UseYouTubePlayerReturn {
	const {
		containerElement,
		videoId,
		cues,
		leadTimeMs,
		onCueTrigger,
		onStateChange,
		onTimeUpdate,
		onReady,
		playerVars,
	} = options;

	const [isReady, setIsReady] = useState(false);
	const [playerState, setPlayerState] = useState<number>(-1);
	const [currentTime, setCurrentTime] = useState<number>(0);
	const [isMuted, setIsMuted] = useState<boolean>(false);
	const [volume, setVolume] = useState<number>(100);
	const [playbackRate, setPlaybackRate] = useState<number>(1);

	const playerRef = useRef<YT.Player | null>(null);
	const syncEngineRef = useRef<YouTubeSyncEngine | null>(null);

	// Stable callbacks stored in refs to avoid rebuilding engine
	const callbacksRef = useRef({
		onCueTrigger,
		onStateChange,
		onTimeUpdate,
		onReady,
	});

	useEffect(() => {
		callbacksRef.current = {
			onCueTrigger,
			onStateChange,
			onTimeUpdate,
			onReady,
		};
	}, [onCueTrigger, onStateChange, onTimeUpdate, onReady]);

	useEffect(() => {
		if (syncEngineRef.current && cues) {
			syncEngineRef.current.setCues(cues);
		}
	}, [cues]);

	useEffect(() => {
		if (!containerElement || !videoId) {
			return;
		}

		let isMounted = true;

		loadYouTubeIframeApi()
			.then((yt) => {
				if (!isMounted) {
					return;
				}

				const adapter: YouTubePlayerAdapter = {
					getCurrentTime: () => playerRef.current?.getCurrentTime?.() ?? 0,
					getPlayerState: () => playerRef.current?.getPlayerState?.() ?? -1,
					getPlaybackRate: () => playerRef.current?.getPlaybackRate?.() ?? 1,
					getVolume: () => playerRef.current?.getVolume?.() ?? 100,
					isMuted: () => playerRef.current?.isMuted?.() ?? false,
					pauseVideo: () => playerRef.current?.pauseVideo?.(),
					playVideo: () => playerRef.current?.playVideo?.(),
					seekTo: (seconds: number, allowSeekAhead = true) =>
						playerRef.current?.seekTo?.(seconds, allowSeekAhead),
					setPlaybackRate: (rate: number) =>
						playerRef.current?.setPlaybackRate?.(rate),
					setVolume: (vol: number) => playerRef.current?.setVolume?.(vol),
					mute: () => playerRef.current?.mute?.(),
					unMute: () => playerRef.current?.unMute?.(),
				};

				const engine = new YouTubeSyncEngine({
					player: adapter,
					cues,
					leadTimeMs,
					onCueTrigger: (cue) => callbacksRef.current.onCueTrigger?.(cue),
					onStateChange: (state) => {
						setPlayerState(state);
						callbacksRef.current.onStateChange?.(state);
					},
					onTimeUpdate: (time) => {
						setCurrentTime(time);
						callbacksRef.current.onTimeUpdate?.(time);
					},
				});

				syncEngineRef.current = engine;

				playerRef.current = new yt.Player(containerElement, {
					videoId,
					playerVars: {
						playsinline: 1,
						rel: 0,
						modestbranding: 1,
						...playerVars,
					},
					events: {
						onReady: () => {
							if (!isMounted) {
								return;
							}
							setIsReady(true);
							if (playerRef.current) {
								setIsMuted(playerRef.current.isMuted?.() ?? false);
								setVolume(playerRef.current.getVolume?.() ?? 100);
								setPlaybackRate(playerRef.current.getPlaybackRate?.() ?? 1);
							}
							callbacksRef.current.onReady?.();
						},
						onStateChange: (event: YT.OnStateChangeEvent) => {
							if (!isMounted) {
								return;
							}
							const newState = event.data;
							setPlayerState(newState);
							engine.handlePlayerStateChange(newState);
						},
					},
				});
			})
			.catch(() => {
				// Handled gracefully
			});

		return () => {
			isMounted = false;
			if (syncEngineRef.current) {
				syncEngineRef.current.stop();
				syncEngineRef.current = null;
			}
			if (playerRef.current) {
				try {
					playerRef.current.destroy();
				} catch {
					// Ignore destruction errors on unmount
				}
				playerRef.current = null;
			}
			setIsReady(false);
		};
	}, [containerElement, videoId, leadTimeMs, playerVars, cues]);

	const play = useCallback(() => {
		playerRef.current?.playVideo?.();
	}, []);

	const pause = useCallback(() => {
		playerRef.current?.pauseVideo?.();
	}, []);

	const seekTo = useCallback((seconds: number, allowSeekAhead = true) => {
		playerRef.current?.seekTo?.(seconds, allowSeekAhead);
		setCurrentTime(seconds);
	}, []);

	const updatePlaybackRate = useCallback((rate: number) => {
		playerRef.current?.setPlaybackRate?.(rate);
		setPlaybackRate(rate);
	}, []);

	const updateVolume = useCallback((vol: number) => {
		playerRef.current?.setVolume?.(vol);
		setVolume(vol);
	}, []);

	const handleMute = useCallback(() => {
		playerRef.current?.mute?.();
		setIsMuted(true);
	}, []);

	const handleUnMute = useCallback(() => {
		playerRef.current?.unMute?.();
		setIsMuted(false);
	}, []);

	const updateCues = useCallback((newCues: readonly YouTubeCue[]) => {
		syncEngineRef.current?.setCues(newCues);
	}, []);

	return {
		isReady,
		playerState,
		currentTime,
		isMuted,
		volume,
		playbackRate,
		play,
		pause,
		seekTo,
		setPlaybackRate: updatePlaybackRate,
		setVolume: updateVolume,
		mute: handleMute,
		unMute: handleUnMute,
		updateCues,
	};
}
