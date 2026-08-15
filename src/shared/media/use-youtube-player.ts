import { useCallback, useEffect, useRef, useState } from "react";
import {
	loadYouTubeIframeApi,
	type YouTubePlayer,
	type YouTubePlayerEvent,
	YouTubePlayerState,
	type YouTubePlayerStateChangeEvent,
} from "./youtube";

export type YouTubeContainerRef = (node: HTMLDivElement | null) => void;

export interface UseYouTubePlayerOptions {
	autoplay?: boolean;
	onReady?: (duration: number) => void;
	onStateChange?: (state: YouTubePlayerState) => void;
	onTimeUpdate?: (currentTime: number) => void;
	videoId: string;
}

export interface UseYouTubePlayerResult {
	containerRef: YouTubeContainerRef;
	currentTime: number;
	duration: number;
	isReady: boolean;
	pause: () => void;
	play: () => void;
	playerState: YouTubePlayerState | null;
	replay: () => void;
	seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
}

function safeMediaValue(value: number): number {
	return Number.isFinite(value) && value >= 0 ? value : 0;
}

function usePlayerControls(activePlayerRef: { current: YouTubePlayer | null }) {
	const play = useCallback(() => {
		activePlayerRef.current?.playVideo();
	}, [activePlayerRef]);

	const pause = useCallback(() => {
		activePlayerRef.current?.pauseVideo();
	}, [activePlayerRef]);

	const seekTo = useCallback(
		(seconds: number, allowSeekAhead = true) => {
			activePlayerRef.current?.seekTo(seconds, allowSeekAhead);
		},
		[activePlayerRef],
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

interface CreatePlayerOptions {
	autoplay: boolean;
	container: HTMLDivElement;
	handleReady: (event: YouTubePlayerEvent) => void;
	handleStateChange: (event: YouTubePlayerStateChangeEvent) => void;
	videoId: string;
	youtube: Awaited<ReturnType<typeof loadYouTubeIframeApi>>;
}

function createPlayerInstance({
	autoplay,
	container,
	handleReady,
	handleStateChange,
	videoId,
	youtube,
}: CreatePlayerOptions): YouTubePlayer {
	return new youtube.Player(container, {
		events: {
			onReady: handleReady,
			onStateChange: handleStateChange,
		},
		playerVars: {
			autoplay: autoplay ? 1 : 0,
			controls: 0,
		},
		videoId,
	});
}

interface UseYouTubePlayerStateOptions {
	autoplay: boolean;
	container: HTMLDivElement | null;
	onReady?: (duration: number) => void;
	onStateChange?: (state: YouTubePlayerState) => void;
	onTimeUpdate?: (currentTime: number) => void;
	videoId: string;
}

interface TimePollerContext {
	getCurrentPlayer: () => YouTubePlayer | undefined;
	isActiveGeneration: () => boolean;
	onTimeUpdate: (time: number) => void;
	setCurrentTime: (time: number) => void;
}

function createTimePoller({
	getCurrentPlayer,
	isActiveGeneration,
	onTimeUpdate,
	setCurrentTime,
}: TimePollerContext) {
	let animationFrameId: number | undefined;

	const stopPolling = () => {
		if (animationFrameId !== undefined) {
			window.cancelAnimationFrame(animationFrameId);
			animationFrameId = undefined;
		}
	};

	const sampleTime = () => {
		const player = getCurrentPlayer();
		if (!isActiveGeneration() || !player) {
			return;
		}
		const sampled = safeMediaValue(player.getCurrentTime());
		setCurrentTime(sampled);
		onTimeUpdate(sampled);
		animationFrameId = window.requestAnimationFrame(sampleTime);
	};

	const startPolling = () => {
		stopPolling();
		sampleTime();
	};

	return { startPolling, stopPolling };
}

function bindVisibilitySync(
	getCurrentPlayer: () => YouTubePlayer | undefined,
	isActiveGeneration: () => boolean,
) {
	const handleVisibilityChange = () => {
		const player = getCurrentPlayer();
		if (!isActiveGeneration() || !player) {
			return;
		}
		if (document.visibilityState === "hidden" || document.hidden) {
			player.pauseVideo();
		}
	};

	document.addEventListener("visibilitychange", handleVisibilityChange);
	return () => {
		document.removeEventListener("visibilitychange", handleVisibilityChange);
	};
}

interface PlayerEventHandlersContext {
	getCurrentPlayer: () => YouTubePlayer | undefined;
	hasNotifiedReady: () => boolean;
	isActiveGeneration: () => boolean;
	markReadyNotified: () => void;
	onReady?: (duration: number) => void;
	onStateChange?: (state: YouTubePlayerState) => void;
	poller: ReturnType<typeof createTimePoller>;
	setActivePlayer: (player: YouTubePlayer) => void;
	setCurrentTime: (time: number) => void;
	setDuration: (duration: number) => void;
	setIsReady: (isReady: boolean) => void;
	setPlayerState: (state: YouTubePlayerState) => void;
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

		ctx.setPlayerState(event.data);
		if (event.data === YouTubePlayerState.PLAYING) {
			ctx.poller.startPolling();
		} else {
			ctx.poller.stopPolling();
		}
		ctx.onStateChange?.(event.data);
	};

	return { handleReady, handleStateChange };
}

interface PlayerLifecycleParams extends UseYouTubePlayerStateOptions {
	activePlayerRef: React.RefObject<YouTubePlayer | null>;
	generationRef: React.RefObject<number>;
	setCurrentTime: (time: number) => void;
	setDuration: (duration: number) => void;
	setIsReady: (isReady: boolean) => void;
	setPlayerState: (state: YouTubePlayerState | null) => void;
}

function resetPlayerState({
	setCurrentTime,
	setDuration,
	setIsReady,
	setPlayerState,
}: Pick<
	PlayerLifecycleParams,
	"setCurrentTime" | "setDuration" | "setIsReady" | "setPlayerState"
>) {
	setIsReady(false);
	setDuration(0);
	setCurrentTime(0);
	setPlayerState(null);
}

function loadAndMountPlayer(
	options: Omit<CreatePlayerOptions, "youtube">,
	isActiveGeneration: () => boolean,
	onCreated: (player: YouTubePlayer) => void,
) {
	void loadYouTubeIframeApi()
		.then((youtube) => {
			if (!isActiveGeneration()) {
				return;
			}
			onCreated(createPlayerInstance({ ...options, youtube }));
		})
		.catch(() => undefined);
}

function usePlayerLifecycle({
	activePlayerRef,
	autoplay,
	container,
	generationRef,
	onReady,
	onStateChange,
	onTimeUpdate,
	setCurrentTime,
	setDuration,
	setIsReady,
	setPlayerState,
	videoId,
}: PlayerLifecycleParams) {
	const onReadyRef = useRef(onReady);
	const onStateChangeRef = useRef(onStateChange);
	const onTimeUpdateRef = useRef(onTimeUpdate);

	onReadyRef.current = onReady;
	onStateChangeRef.current = onStateChange;
	onTimeUpdateRef.current = onTimeUpdate;

	useEffect(() => {
		const generation = generationRef.current + 1;
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
			onTimeUpdate: (time) => onTimeUpdateRef.current?.(time),
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
			onReady: (d) => onReadyRef.current?.(d),
			onStateChange: (s) => onStateChangeRef.current?.(s),
			poller,
			setActivePlayer: (p) => {
				player = p;
				activePlayerRef.current = p;
			},
			setCurrentTime,
			setDuration,
			setIsReady,
			setPlayerState,
		});

		resetPlayerState({
			setCurrentTime,
			setDuration,
			setIsReady,
			setPlayerState,
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
		generationRef,
		setCurrentTime,
		setDuration,
		setIsReady,
		setPlayerState,
		videoId,
	]);
}

function useYouTubePlayerState(options: UseYouTubePlayerStateOptions) {
	const activePlayerRef = useRef<YouTubePlayer | null>(null);
	const generationRef = useRef(0);
	const [isReady, setIsReady] = useState(false);
	const [playerState, setPlayerState] = useState<YouTubePlayerState | null>(
		null,
	);
	const [duration, setDuration] = useState(0);
	const [currentTime, setCurrentTime] = useState(0);

	usePlayerLifecycle({
		...options,
		activePlayerRef,
		generationRef,
		setCurrentTime,
		setDuration,
		setIsReady,
		setPlayerState,
	});

	return {
		activePlayerRef,
		currentTime,
		duration,
		isReady,
		playerState,
	};
}

export function useYouTubePlayer({
	autoplay = false,
	onReady,
	onStateChange,
	onTimeUpdate,
	videoId,
}: UseYouTubePlayerOptions): UseYouTubePlayerResult {
	const [container, setContainer] = useState<HTMLDivElement | null>(null);
	const containerRef = useCallback((node: HTMLDivElement | null) => {
		setContainer(node);
	}, []);

	const state = useYouTubePlayerState({
		autoplay,
		container,
		onReady,
		onStateChange,
		onTimeUpdate,
		videoId,
	});

	const controls = usePlayerControls(state.activePlayerRef);

	return {
		containerRef,
		currentTime: state.currentTime,
		duration: state.duration,
		isReady: state.isReady,
		pause: controls.pause,
		play: controls.play,
		playerState: state.playerState,
		replay: controls.replay,
		seekTo: controls.seekTo,
	};
}
