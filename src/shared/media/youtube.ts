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

export interface YouTubePlayerOptions {
	events?: {
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
