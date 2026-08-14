import { useCallback, useEffect, useRef, useState } from "react";
import {
	loadYouTubeIframeApi,
	type YouTubePlayer,
	type YouTubePlayerEvent,
} from "./youtube";

export type YouTubeContainerRef = (node: HTMLDivElement | null) => void;

export interface UseYouTubePlayerOptions {
	autoplay?: boolean;
	onReady?: (duration: number) => void;
	videoId: string;
}

export interface UseYouTubePlayerResult {
	containerRef: YouTubeContainerRef;
	currentTime: number;
	duration: number;
	isReady: boolean;
}

function safeMediaValue(value: number): number {
	return Number.isFinite(value) && value >= 0 ? value : 0;
}

export function useYouTubePlayer({
	autoplay = false,
	onReady,
	videoId,
}: UseYouTubePlayerOptions): UseYouTubePlayerResult {
	const [container, setContainer] = useState<HTMLDivElement | null>(null);
	const onReadyRef = useRef(onReady);
	const generationRef = useRef(0);
	const [isReady, setIsReady] = useState(false);
	const [duration, setDuration] = useState(0);
	const [currentTime, setCurrentTime] = useState(0);

	onReadyRef.current = onReady;

	const containerRef = useCallback((node: HTMLDivElement | null) => {
		setContainer(node);
	}, []);

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

		if (!container) {
			return () => {
				active = false;
				generationRef.current += 1;
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
				if (!isActiveGeneration()) {
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
			})
			.catch(() => undefined);

		return () => {
			active = false;
			generationRef.current += 1;
			if (player) {
				player.destroy();
			}
		};
	}, [autoplay, container, videoId]);

	return {
		containerRef,
		currentTime,
		duration,
		isReady,
	};
}
