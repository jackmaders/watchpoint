import { useCallback, useEffect, useRef, useState } from "react";
import {
	loadYouTubeIframeApi,
	type YouTubePlayer,
	type YouTubePlayerEvent,
	type YouTubePlayerState,
	type YouTubePlayerStateChangeEvent,
} from "./youtube";

export type YouTubeContainerRef = (node: HTMLDivElement | null) => void;

export interface UseYouTubePlayerOptions {
	autoplay?: boolean;
	onReady?: (duration: number) => void;
	onStateChange?: (state: YouTubePlayerState) => void;
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
	videoId: string;
}

function useYouTubePlayerState({
	autoplay,
	container,
	onReady,
	onStateChange,
	videoId,
}: UseYouTubePlayerStateOptions) {
	const onReadyRef = useRef(onReady);
	const onStateChangeRef = useRef(onStateChange);
	const activePlayerRef = useRef<YouTubePlayer | null>(null);
	const generationRef = useRef(0);
	const [isReady, setIsReady] = useState(false);
	const [playerState, setPlayerState] = useState<YouTubePlayerState | null>(
		null,
	);
	const [duration, setDuration] = useState(0);
	const [currentTime, setCurrentTime] = useState(0);

	onReadyRef.current = onReady;
	onStateChangeRef.current = onStateChange;

	useEffect(() => {
		const generation = generationRef.current + 1;
		generationRef.current = generation;
		let active = true;
		let player: YouTubePlayer | undefined;
		let hasNotifiedReady = false;
		const isActiveGeneration = () =>
			active && generationRef.current === generation;

		setIsReady(false);
		setDuration(0);
		setCurrentTime(0);
		setPlayerState(null);
		activePlayerRef.current = null;

		if (!container) {
			return () => {
				active = false;
				generationRef.current += 1;
				activePlayerRef.current = null;
			};
		}

		const handleReady = (event: YouTubePlayerEvent) => {
			if (
				!isActiveGeneration() ||
				(player && event.target !== player) ||
				hasNotifiedReady
			) {
				return;
			}

			player = event.target;
			activePlayerRef.current = player;
			hasNotifiedReady = true;
			const readyDuration = safeMediaValue(player.getDuration());
			const readyCurrentTime = safeMediaValue(player.getCurrentTime());
			setDuration(readyDuration);
			setCurrentTime(readyCurrentTime);
			setIsReady(true);
			onReadyRef.current?.(readyDuration);
		};

		const handleStateChange = (event: YouTubePlayerStateChangeEvent) => {
			if (!isActiveGeneration() || (player && event.target !== player)) {
				return;
			}

			setPlayerState(event.data);
			onStateChangeRef.current?.(event.data);
		};

		void loadYouTubeIframeApi()
			.then((youtube) => {
				if (!isActiveGeneration()) {
					return;
				}

				player = createPlayerInstance({
					autoplay,
					container,
					handleReady,
					handleStateChange,
					videoId,
					youtube,
				});
			})
			.catch(() => undefined);

		return () => {
			active = false;
			generationRef.current += 1;
			activePlayerRef.current = null;
			if (player) {
				player.destroy();
			}
		};
	}, [autoplay, container, videoId]);

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
