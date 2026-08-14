const YOUTUBE_IFRAME_API_URL = "https://www.youtube.com/iframe_api";

export interface YouTubePlayer {
	destroy(): void;
	getDuration(): number;
	getCurrentTime(): number;
	playVideo(): void;
	pauseVideo(): void;
	seekTo(seconds: number, allowSeekAhead: boolean): void;
}

export interface YouTubePlayerEvent {
	target: YouTubePlayer;
}

export interface YouTubePlayerOptions {
	events?: {
		onReady?: (event: YouTubePlayerEvent) => void;
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

function resetFailedLoad(promise: Promise<YouTubeNamespace>) {
	if (loadPromise === promise) {
		loadPromise = undefined;
	}
}

export function loadYouTubeIframeApi(): Promise<YouTubeNamespace> {
	const existingNamespace = getReadyNamespace();
	if (existingNamespace) {
		return Promise.resolve(existingNamespace);
	}

	if (typeof window === "undefined" || typeof document === "undefined") {
		return Promise.reject(
			new Error("The YouTube IFrame API can only load in a browser."),
		);
	}

	if (loadPromise) {
		return loadPromise;
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
	const handleApiReady = () => {
		resolveIfReady();
	};
	const previousReadyHandler = window.onYouTubeIframeAPIReady;
	window.onYouTubeIframeAPIReady = () => {
		previousReadyHandler?.();
		handleApiReady();
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

	script.addEventListener("load", resolveIfReady, { once: true });
	script.addEventListener(
		"error",
		() => rejectLoad(new Error("The YouTube IFrame API failed to load.")),
		{ once: true },
	);

	promise.catch(() => resetFailedLoad(promise));
	return promise;
}
