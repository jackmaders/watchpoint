import { useCallback, useEffect, useRef, useState } from "react";
import { createTimePoller, safeMediaValue } from "./time-poller";
import {
	PlaybackStatus,
	type VodContainerRef,
	type VodPlayerOptions,
	type VodPlayerResult,
} from "./types";
import { bindVisibilitySync } from "./visibility-sync";
import {
	loadAndMountPlayer,
	toPlaybackStatus,
	type YouTubePlayer,
	type YouTubePlayerEvent,
	YouTubePlayerState,
	type YouTubePlayerStateChangeEvent,
} from "./youtube-adapter";

function clampSeekSeconds(seconds: number, duration: number): number {
	if (!Number.isFinite(seconds) || seconds < 0) {
		return 0;
	}
	if (duration > 0 && seconds > duration) {
		return duration;
	}
	return seconds;
}

function usePlayerControls(
	activePlayerRef: React.RefObject<YouTubePlayer | null>,
	durationRef: React.RefObject<number>,
) {
	const play = useCallback(() => {
		activePlayerRef.current?.playVideo();
	}, [activePlayerRef]);

	const pause = useCallback(() => {
		activePlayerRef.current?.pauseVideo();
	}, [activePlayerRef]);

	const seekTo = useCallback(
		(seconds: number, allowSeekAhead = true) => {
			if (!activePlayerRef.current) {
				return;
			}
			const clamped = clampSeekSeconds(seconds, durationRef.current);
			activePlayerRef.current.seekTo(clamped, allowSeekAhead);
		},
		[activePlayerRef, durationRef],
	);

	const replay = useCallback(() => {
		if (!activePlayerRef.current) {
			return;
		}
		activePlayerRef.current.seekTo(0, true);
		activePlayerRef.current.playVideo();
	}, [activePlayerRef]);

	return { pause, play, replay, seekTo };
}

interface UseVodPlayerStateOptions extends VodPlayerOptions {
	container: HTMLDivElement | null;
}

interface PlayerEventHandlersContext {
	getCurrentPlayer: () => YouTubePlayer | undefined;
	hasNotifiedReady: () => boolean;
	isActiveGeneration: () => boolean;
	markReadyNotified: () => void;
	onReady?: (duration: number) => void;
	onStatusChange?: (status: PlaybackStatus) => void;
	poller: ReturnType<typeof createTimePoller>;
	setActivePlayer: (player: YouTubePlayer) => void;
	setCurrentTime: (time: number) => void;
	setDuration: (duration: number) => void;
	setIsReady: (isReady: boolean) => void;
	setStatus: (status: PlaybackStatus) => void;
}

function createPlayerEventHandlers(ctx: PlayerEventHandlersContext) {
	const handleReady = (event: YouTubePlayerEvent) => {
		const player = ctx.getCurrentPlayer();
		if (
			!ctx.isActiveGeneration() ||
			(player && event.target !== player) ||
			ctx.hasNotifiedReady()
		) {
			return;
		}

		ctx.setActivePlayer(event.target);
		ctx.markReadyNotified();
		const readyDuration = safeMediaValue(event.target.getDuration());
		const readyCurrentTime = safeMediaValue(event.target.getCurrentTime());
		ctx.setDuration(readyDuration);
		ctx.setCurrentTime(readyCurrentTime);
		ctx.setIsReady(true);
		ctx.onReady?.(readyDuration);
	};

	const handleStateChange = (event: YouTubePlayerStateChangeEvent) => {
		const player = ctx.getCurrentPlayer();
		if (!ctx.isActiveGeneration() || (player && event.target !== player)) {
			return;
		}

		const status = toPlaybackStatus(event.data);
		ctx.setStatus(status);
		if (event.data === YouTubePlayerState.PLAYING) {
			ctx.poller.startPolling();
		} else {
			ctx.poller.stopPolling();
		}
		ctx.onStatusChange?.(status);
	};

	return { handleReady, handleStateChange };
}

interface PlayerLifecycleParams extends UseVodPlayerStateOptions {
	activePlayerRef: React.RefObject<YouTubePlayer | null>;
	durationRef: React.RefObject<number>;
	generationRef: React.RefObject<number>;
	setCurrentTime: (time: number) => void;
	setDuration: (duration: number) => void;
	setIsReady: (isReady: boolean) => void;
	setStatus: (status: PlaybackStatus) => void;
}

function resetPlayerState({
	durationRef,
	setCurrentTime,
	setDuration,
	setIsReady,
	setStatus,
}: Pick<
	PlayerLifecycleParams,
	"durationRef" | "setCurrentTime" | "setDuration" | "setIsReady" | "setStatus"
>) {
	setIsReady(false);
	durationRef.current = 0;
	setDuration(0);
	setCurrentTime(0);
	setStatus(PlaybackStatus.UNSTARTED);
}

function invokeWithLifecycleKey<T>(
	callback: ((value: T, lifecycleKey?: number) => void) | undefined,
	value: T,
	lifecycleKey: number | undefined,
) {
	if (lifecycleKey === undefined) {
		callback?.(value);
		return;
	}
	callback?.(value, lifecycleKey);
}

function usePlayerLifecycle({
	activePlayerRef,
	autoplay = false,
	container,
	durationRef,
	generationRef,
	lifecycleKey,
	onReady,
	onStatusChange,
	onTimeUpdate,
	setCurrentTime,
	setDuration,
	setIsReady,
	setStatus,
	videoId,
}: PlayerLifecycleParams) {
	const onReadyRef = useRef(onReady);
	const onStatusChangeRef = useRef(onStatusChange);
	const onTimeUpdateRef = useRef(onTimeUpdate);

	onReadyRef.current = onReady;
	onStatusChangeRef.current = onStatusChange;
	onTimeUpdateRef.current = onTimeUpdate;
	useEffect(() => {
		const generation = lifecycleKey ?? generationRef.current + 1;
		generationRef.current = generation;
		let active = true;
		let player: YouTubePlayer | undefined;
		let hasNotifiedReady = false;
		const isActiveGeneration = () =>
			active && generationRef.current === generation;
		const getCurrentPlayer = () => player;

		const poller = createTimePoller({
			getCurrentPlayer,
			isActiveGeneration,
			onTimeUpdate: (time) =>
				invokeWithLifecycleKey(onTimeUpdateRef.current, time, lifecycleKey),
			setCurrentTime,
		});
		const unbindVisibility = bindVisibilitySync(
			getCurrentPlayer,
			isActiveGeneration,
		);
		const { handleReady, handleStateChange } = createPlayerEventHandlers({
			getCurrentPlayer,
			hasNotifiedReady: () => hasNotifiedReady,
			isActiveGeneration,
			markReadyNotified: () => {
				hasNotifiedReady = true;
			},
			onReady: (d) =>
				invokeWithLifecycleKey(onReadyRef.current, d, lifecycleKey),
			onStatusChange: (s) =>
				invokeWithLifecycleKey(onStatusChangeRef.current, s, lifecycleKey),
			poller,
			setActivePlayer: (p) => {
				player = p;
				activePlayerRef.current = p;
			},
			setCurrentTime,
			setDuration: (d) => {
				durationRef.current = d;
				setDuration(d);
			},
			setIsReady,
			setStatus,
		});

		resetPlayerState({
			durationRef,
			setCurrentTime,
			setDuration,
			setIsReady,
			setStatus,
		});
		activePlayerRef.current = null;

		const cleanup = () => {
			active = false;
			generationRef.current += 1;
			activePlayerRef.current = null;
			poller.stopPolling();
			unbindVisibility();
			if (player) {
				player.destroy();
			}
		};

		if (!container) {
			return cleanup;
		}

		loadAndMountPlayer(
			{ autoplay, container, handleReady, handleStateChange, videoId },
			isActiveGeneration,
			(p) => {
				player = p;
			},
		);

		return cleanup;
	}, [
		activePlayerRef,
		autoplay,
		container,
		durationRef,
		generationRef,
		lifecycleKey,
		setCurrentTime,
		setDuration,
		setIsReady,
		setStatus,
		videoId,
	]);
}

function useVodPlayerState(options: UseVodPlayerStateOptions) {
	const activePlayerRef = useRef<YouTubePlayer | null>(null);
	const durationRef = useRef(0);
	const generationRef = useRef(0);
	const [isReady, setIsReady] = useState(false);
	const [status, setStatus] = useState<PlaybackStatus>(
		PlaybackStatus.UNSTARTED,
	);
	const [duration, setDuration] = useState(0);
	const [currentTime, setCurrentTime] = useState(0);

	usePlayerLifecycle({
		...options,
		activePlayerRef,
		durationRef,
		generationRef,
		setCurrentTime,
		setDuration,
		setIsReady,
		setStatus,
	});

	return {
		activePlayerRef,
		currentTime,
		duration,
		durationRef,
		isReady,
		status,
	};
}

export function useVodPlayer({
	autoplay = false,
	lifecycleKey,
	onReady,
	onStatusChange,
	onTimeUpdate,
	videoId,
}: VodPlayerOptions): VodPlayerResult {
	const [container, setContainer] = useState<HTMLDivElement | null>(null);
	const containerRef: VodContainerRef = useCallback(
		(node: HTMLDivElement | null) => {
			setContainer(node);
		},
		[],
	);

	const state = useVodPlayerState({
		autoplay,
		container,
		lifecycleKey,
		onReady,
		onStatusChange,
		onTimeUpdate,
		videoId,
	});

	const controls = usePlayerControls(state.activePlayerRef, state.durationRef);

	return {
		containerRef,
		currentTime: state.currentTime,
		duration: state.duration,
		isReady: state.isReady,
		pause: controls.pause,
		play: controls.play,
		replay: controls.replay,
		seekTo: controls.seekTo,
		status: state.status,
	};
}
