import {
	type RefCallback,
	type RefObject,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	loadYouTubeIframeApi,
	type YouTubePlayer,
	type YouTubePlayerEvent,
} from "./youtube";

type YouTubeContainerRef = RefObject<HTMLDivElement | null>;
type YouTubeContainerCallback = RefCallback<HTMLDivElement> & {
	current: HTMLDivElement | null;
};

export interface UseYouTubePlayerOptions {
	autoplay?: boolean;
	containerRef?: YouTubeContainerRef;
	onReady?: (duration: number) => void;
	videoId: string;
}

export interface UseYouTubePlayerResult {
	containerRef: YouTubeContainerCallback;
	currentTime: number;
	duration: number;
	isReady: boolean;
}

function safeMediaValue(value: number): number {
	return Number.isFinite(value) && value >= 0 ? value : 0;
}

function useYouTubeContainerRef(containerRef?: YouTubeContainerRef) {
	const [mountedContainer, setMountedContainer] =
		useState<HTMLDivElement | null>(null);
	const mountedContainerRef = useRef<HTMLDivElement | null>(null);
	const resultContainerRef = useMemo<YouTubeContainerCallback>(() => {
		const callback = ((container: HTMLDivElement | null) => {
			mountedContainerRef.current = container;
			setMountedContainer(container);
			if (containerRef) {
				containerRef.current = container;
			}
		}) as YouTubeContainerCallback;
		Object.defineProperty(callback, "current", {
			configurable: true,
			get: () => mountedContainerRef.current,
		});
		return callback;
	}, [containerRef]);

	return { mountedContainer, resultContainerRef };
}

export function useYouTubePlayer({
	autoplay = false,
	containerRef,
	onReady,
	videoId,
}: UseYouTubePlayerOptions): UseYouTubePlayerResult {
	const { mountedContainer, resultContainerRef } =
		useYouTubeContainerRef(containerRef);
	const onReadyRef = useRef(onReady);
	const generationRef = useRef(0);
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
		const isActiveGeneration = () =>
			active && generationRef.current === generation;
		const getCurrentContainer = () => containerRef?.current ?? mountedContainer;

		setIsReady(false);
		setDuration(0);
		setCurrentTime(0);

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
		const createPlayer = (
			youtube: Awaited<ReturnType<typeof loadYouTubeIframeApi>>,
			container: HTMLDivElement,
		) => {
			const createdPlayer = new youtube.Player(container, {
				events: { onReady: handleReady },
				playerVars: {
					autoplay: autoplay ? 1 : 0,
					controls: 0,
				},
				videoId,
			});
			player = createdPlayer;
			return createdPlayer;
		};
		const isStaleContainer = (container: HTMLDivElement) =>
			generationRef.current !== generation ||
			getCurrentContainer() !== container;
		const container = mountedContainer ?? containerRef?.current ?? null;

		if (!container) {
			return () => {
				active = false;
				generationRef.current += 1;
			};
		}

		void loadYouTubeIframeApi()
			.then((youtube) => {
				if (!isActiveGeneration()) {
					return;
				}

				const createdPlayer = createPlayer(youtube, container);
				if (isStaleContainer(container)) {
					active = false;
					createdPlayer.destroy();
					player = undefined;
					return;
				}
			})
			.catch(() => undefined);

		return () => {
			active = false;
			generationRef.current += 1;
			if (player) {
				player.destroy();
			}
		};
	}, [autoplay, containerRef, mountedContainer, videoId]);

	return {
		containerRef: resultContainerRef,
		currentTime,
		duration,
		isReady,
	};
}
