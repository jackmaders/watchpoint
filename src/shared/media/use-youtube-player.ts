import { type RefObject, useEffect, useRef, useState } from "react";
import {
	loadYouTubeIframeApi,
	type YouTubePlayer,
	type YouTubePlayerEvent,
} from "./youtube";

export interface UseYouTubePlayerOptions {
	autoplay?: boolean;
	containerRef?: RefObject<HTMLDivElement | null>;
	onReady?: (duration: number) => void;
	videoId: string;
}

export interface UseYouTubePlayerResult {
	containerRef: RefObject<HTMLDivElement | null>;
	currentTime: number;
	duration: number;
	isReady: boolean;
}

function safeMediaValue(value: number): number {
	return Number.isFinite(value) && value >= 0 ? value : 0;
}

export function useYouTubePlayer({
	autoplay = false,
	containerRef,
	onReady,
	videoId,
}: UseYouTubePlayerOptions): UseYouTubePlayerResult {
	const internalContainerRef = useRef<HTMLDivElement | null>(null);
	const resolvedContainerRef = containerRef ?? internalContainerRef;
	const onReadyRef = useRef(onReady);
	const generationRef = useRef(0);
	const ownedPlayerRef = useRef<YouTubePlayer | null>(null);
	const [isReady, setIsReady] = useState(false);
	const [duration, setDuration] = useState(0);
	const [currentTime, setCurrentTime] = useState(0);

	onReadyRef.current = onReady;

	useEffect(() => {
		const generation = generationRef.current + 1;
		generationRef.current = generation;
		let active = true;
		let player: YouTubePlayer | undefined;
		let hasNotifiedReady = false;

		setIsReady(false);
		setDuration(0);
		setCurrentTime(0);

		const handleReady = (event: YouTubePlayerEvent) => {
			if (
				!active ||
				generationRef.current !== generation ||
				(player && event.target !== player) ||
				hasNotifiedReady
			) {
				return;
			}

			player = event.target;
			hasNotifiedReady = true;
			const readyDuration = safeMediaValue(player.getDuration());
			const readyCurrentTime = safeMediaValue(player.getCurrentTime());
			setDuration(readyDuration);
			setCurrentTime(readyCurrentTime);
			setIsReady(true);
			onReadyRef.current?.(readyDuration);
		};

		void loadYouTubeIframeApi()
			.then((youtube) => {
				const container = resolvedContainerRef.current;
				if (!active || generationRef.current !== generation || !container) {
					return;
				}

				const createdPlayer = new youtube.Player(container, {
					events: { onReady: handleReady },
					playerVars: {
						autoplay: autoplay ? 1 : 0,
						controls: 0,
					},
					videoId,
				});
				player = createdPlayer;

				if (
					!active ||
					generationRef.current !== generation ||
					resolvedContainerRef.current !== container
				) {
					createdPlayer.destroy();
					return;
				}

				ownedPlayerRef.current = createdPlayer;
			})
			.catch(() => undefined);

		return () => {
			active = false;
			generationRef.current += 1;
			if (player) {
				player.destroy();
				if (ownedPlayerRef.current === player) {
					ownedPlayerRef.current = null;
				}
			}
		};
	}, [autoplay, resolvedContainerRef, videoId]);

	return {
		containerRef: resolvedContainerRef,
		currentTime,
		duration,
		isReady,
	};
}
