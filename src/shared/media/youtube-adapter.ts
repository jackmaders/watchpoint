import {
	type MediaFailure,
	MediaFailureCategory,
	PlaybackStatus,
} from "./types";

const YOUTUBE_IFRAME_API_URL = "https://www.youtube.com/iframe_api";

export const YouTubePlayerState = {
	BUFFERING: 3,
	CUED: 5,
	ENDED: 0,
	PAUSED: 2,
	PLAYING: 1,
	UNSTARTED: -1,
} as const;

export type YouTubePlayerState =
	(typeof YouTubePlayerState)[keyof typeof YouTubePlayerState];

export function toPlaybackStatus(rawState: number): PlaybackStatus {
	switch (rawState) {
		case YouTubePlayerState.UNSTARTED:
			return PlaybackStatus.UNSTARTED;
		case YouTubePlayerState.ENDED:
			return PlaybackStatus.ENDED;
		case YouTubePlayerState.PLAYING:
			return PlaybackStatus.PLAYING;
		case YouTubePlayerState.PAUSED:
			return PlaybackStatus.PAUSED;
		case YouTubePlayerState.BUFFERING:
			return PlaybackStatus.BUFFERING;
		case YouTubePlayerState.CUED:
			return PlaybackStatus.CUED;
		default:
			return PlaybackStatus.UNSTARTED;
	}
}

export interface YouTubePlayer {
	destroy(): void;
	getCurrentTime(): number;
	getDuration(): number;
	pauseVideo(): void;
	playVideo(): void;
	seekTo(seconds: number, allowSeekAhead?: boolean): void;
}

export interface YouTubePlayerEvent {
	target: YouTubePlayer;
}

export interface YouTubePlayerStateChangeEvent {
	data: YouTubePlayerState;
	target: YouTubePlayer;
}

export interface YouTubePlayerErrorEvent {
	data: number;
	target: YouTubePlayer;
}

export interface YouTubePlayerOptions {
	events?: {
		onError?: (event: YouTubePlayerErrorEvent) => void;
		onReady?: (event: YouTubePlayerEvent) => void;
		onStateChange?: (event: YouTubePlayerStateChangeEvent) => void;
	};
	playerVars?: {
		autoplay?: 0 | 1;
		controls?: 0 | 1;
	};
	videoId?: string;
}

export interface YouTubeNamespace {
	Player: new (
		element: HTMLElement,
		options: YouTubePlayerOptions,
	) => YouTubePlayer;
}

declare global {
	interface Window {
		YT?: YouTubeNamespace;
		onYouTubeIframeAPIReady?: () => void;
	}
}

let loadPromise: Promise<YouTubeNamespace> | undefined;

function getReadyNamespace(): YouTubeNamespace | undefined {
	if (typeof window === "undefined") {
		return undefined;
	}

	const namespace = window.YT;
	return namespace && typeof namespace.Player === "function"
		? namespace
		: undefined;
}

function resetFailedLoad() {
	loadPromise = undefined;
}

export function loadYouTubeIframeApi(): Promise<YouTubeNamespace> {
	if (loadPromise) {
		return loadPromise;
	}

	const existingNamespace = getReadyNamespace();
	if (existingNamespace) {
		return Promise.resolve(existingNamespace);
	}

	if (typeof window === "undefined" || typeof document === "undefined") {
		return Promise.reject(
			new Error("The YouTube IFrame API can only load in a browser."),
		);
	}

	let resolveLoad: (namespace: YouTubeNamespace) => void;
	let rejectLoad: (error: unknown) => void;
	const promise = new Promise<YouTubeNamespace>((resolve, reject) => {
		resolveLoad = resolve;
		rejectLoad = reject;
	});
	loadPromise = promise;

	const resolveIfReady = () => {
		const namespace = getReadyNamespace();
		if (namespace) {
			resolveLoad(namespace);
		}
	};
	const previousReadyHandler = window.onYouTubeIframeAPIReady;
	window.onYouTubeIframeAPIReady = () => {
		previousReadyHandler?.();
		resolveIfReady();
	};

	const existingScript = document.querySelector<HTMLScriptElement>(
		`script[src="${YOUTUBE_IFRAME_API_URL}"]`,
	);
	const script = existingScript ?? document.createElement("script");
	if (!existingScript) {
		script.src = YOUTUBE_IFRAME_API_URL;
		script.async = true;
		document.head.appendChild(script);
	}

	script.onload = resolveIfReady;
	script.onerror = () =>
		rejectLoad(new Error("The YouTube IFrame API failed to load."));

	promise.catch(resetFailedLoad);
	return promise;
}

export interface CreatePlayerOptions {
	autoplay: boolean;
	container: HTMLDivElement;
	handleReady: (event: YouTubePlayerEvent) => void;
	handleError?: (event: YouTubePlayerErrorEvent) => void;
	handleStateChange: (event: YouTubePlayerStateChangeEvent) => void;
	videoId: string;
	youtube: YouTubeNamespace;
}

export function createYouTubePlayerInstance({
	autoplay,
	container,
	handleError,
	handleReady,
	handleStateChange,
	videoId,
	youtube,
}: CreatePlayerOptions): YouTubePlayer {
	return new youtube.Player(container, {
		events: {
			onError: handleError,
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

export function loadAndMountPlayer(
	options: Omit<CreatePlayerOptions, "youtube">,
	isActiveGeneration: () => boolean,
	onCreated: (player: YouTubePlayer) => void,
	onError?: (failure: MediaFailure) => void,
) {
	void loadYouTubeIframeApi()
		.then((youtube) => {
			if (!isActiveGeneration()) {
				return;
			}
			try {
				onCreated(createYouTubePlayerInstance({ ...options, youtube }));
			} catch (error) {
				onError?.({
					category: MediaFailureCategory.PLAYER_CONSTRUCTION,
					// c8 ignore next -- provider constructors throw Error instances in production.
					message:
						error instanceof Error
							? error.message
							: "The media player could not be created.",
				});
			}
		})
		.catch((error: unknown) => {
			if (!isActiveGeneration()) return;
			onError?.({
				category: MediaFailureCategory.API_LOAD,
				// c8 ignore next -- API rejection is normalized to Error by the loader.
				message:
					error instanceof Error
						? error.message
						: "The YouTube IFrame API failed to load.",
			});
		});
}
